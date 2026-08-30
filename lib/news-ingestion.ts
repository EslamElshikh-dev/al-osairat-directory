import 'server-only';

import { createHash } from 'node:crypto';
import { getGeneratedNewsEditorial, isNewsEditorialEnabled } from '@/lib/news-editorial';
import {
  collectLocalNewsFromSources,
  fetchSourceDetail,
  type LocalNewsItem,
} from '@/lib/news';
import {
  completeNewsIngestion,
  getStoredNewsProcessingState,
  saveNewsProcessingResult,
  touchNewsSource,
  upsertDiscoveredNews,
  type NewsIngestionCompletion,
  type StoredNewsProcessingState,
} from '@/lib/news-persistence';

export type NewsIngestionResult = NewsIngestionCompletion & {
  runId: string;
  trigger: 'cron' | 'visit' | 'manual';
  processedCount: number;
  skippedUnchangedCount: number;
};

const DEFAULT_BATCH_SIZE = 3;
const READY_REFRESH_AFTER_MS = 1000 * 60 * 60 * 24;
const FAILED_RETRY_AFTER_MS = 1000 * 60 * 60 * 6;

function batchSize() {
  const configured = Number.parseInt(process.env.NEWS_INGESTION_BATCH_SIZE || '', 10);
  return Number.isFinite(configured)
    ? Math.max(1, Math.min(configured, 5))
    : DEFAULT_BATCH_SIZE;
}

function sourceHash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown ingestion error';
  return message.replace(/\s+/g, ' ').slice(0, 240);
}

function shouldProcess(state: StoredNewsProcessingState | undefined, now: number) {
  if (!state || state.editorialStatus === 'pending') return true;
  if (!state.sourceFetchedAt) return true;
  const fetchedAt = Date.parse(state.sourceFetchedAt);
  if (!Number.isFinite(fetchedAt)) return true;
  const retryAfter = state.editorialStatus === 'ready'
    ? READY_REFRESH_AFTER_MS
    : FAILED_RETRY_AFTER_MS;
  return fetchedAt <= now - retryAfter;
}

function prioritizeItems(
  items: LocalNewsItem[],
  states: Map<string, StoredNewsProcessingState>,
  now: number,
) {
  return items
    .filter((item) => shouldProcess(states.get(item.id), now))
    .toSorted((a, b) => {
      const aReady = states.get(a.id)?.editorialStatus === 'ready';
      const bReady = states.get(b.id)?.editorialStatus === 'ready';
      if (aReady !== bReady) return Number(aReady) - Number(bReady);
      return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    })
    .slice(0, batchSize());
}

export async function runClaimedNewsIngestion(input: {
  runId: string;
  trigger: 'cron' | 'visit' | 'manual';
}): Promise<NewsIngestionResult> {
  const errors: NonNullable<NewsIngestionCompletion['errors']> = [];
  let feed;
  let generatedCount = 0;
  let failedCount = 0;
  let processedCount = 0;
  let skippedUnchangedCount = 0;

  try {
    feed = await collectLocalNewsFromSources(80);
    const seenAt = new Date().toISOString();
    await upsertDiscoveredNews(feed.items, seenAt);

    const editorialEnabled = isNewsEditorialEnabled();
    const states = editorialEnabled
      ? await getStoredNewsProcessingState(feed.items.map((item) => item.id))
      : new Map<string, StoredNewsProcessingState>();
    const candidates = editorialEnabled
      ? prioritizeItems(feed.items, states, Date.now())
      : [];

    for (const item of candidates) {
      const previous = states.get(item.id);
      const preserveExistingEditorial = previous?.editorialStatus === 'ready';
      processedCount += 1;

      try {
        const detail = await fetchSourceDetail(item);
        const sourceText = detail.sourceText?.trim() || '';
        const currentHash = sourceText ? sourceHash(sourceText) : '';

        if (preserveExistingEditorial && currentHash && currentHash === previous?.sourceHash) {
          await touchNewsSource(item.id);
          skippedUnchangedCount += 1;
          continue;
        }

        if (sourceText.length < 500) {
          await saveNewsProcessingResult({
            id: item.id,
            sourceExcerpt: detail.sourceExcerpt || item.summary,
            sourceText,
            sourceHash: currentHash,
            editorialStatus: 'insufficient',
            error: 'Source did not expose enough article text for verified full coverage',
            preserveExistingEditorial,
          });
          if (!preserveExistingEditorial) failedCount += 1;
          continue;
        }

        const generatedEditorial = await getGeneratedNewsEditorial({
          ...item,
          ...detail,
          sourceText,
        });

        if (!generatedEditorial) {
          await saveNewsProcessingResult({
            id: item.id,
            sourceExcerpt: detail.sourceExcerpt || item.summary,
            sourceText,
            sourceHash: currentHash,
            editorialStatus: 'failed',
            error: 'Editorial generation or verification was rejected',
            preserveExistingEditorial,
          });
          failedCount += 1;
          errors.push({ id: item.id, stage: 'editorial', message: 'Generation or verification rejected' });
          continue;
        }

        await saveNewsProcessingResult({
          id: item.id,
          sourceExcerpt: detail.sourceExcerpt || item.summary,
          sourceText,
          sourceHash: currentHash,
          editorialStatus: 'ready',
          generatedEditorial,
        });
        generatedCount += 1;
      } catch (error) {
        failedCount += 1;
        const message = safeErrorMessage(error);
        errors.push({ id: item.id, stage: 'item', message });
        try {
          await saveNewsProcessingResult({
            id: item.id,
            editorialStatus: 'failed',
            error: message,
            preserveExistingEditorial,
          });
        } catch (writeError) {
          errors.push({ id: item.id, stage: 'item-write', message: safeErrorMessage(writeError) });
        }
      }
    }

    const status: NewsIngestionCompletion['status'] = feed.connectedSourceCount === 0
      ? 'failed'
      : feed.connectedSourceCount < feed.totalSourceCount || failedCount > 0
        ? 'partial'
        : 'succeeded';

    const completion: NewsIngestionCompletion = {
      status,
      itemCount: feed.items.length,
      liveItemCount: feed.liveItemCount,
      connectedSourceCount: feed.connectedSourceCount,
      totalSourceCount: feed.totalSourceCount,
      generatedCount,
      failedCount,
      ...(errors.length ? { errors } : {}),
    };

    await completeNewsIngestion(input.runId, completion);
    return {
      ...completion,
      runId: input.runId,
      trigger: input.trigger,
      processedCount,
      skippedUnchangedCount,
    };
  } catch (error) {
    const message = safeErrorMessage(error);
    errors.push({ stage: 'run', message });
    const completion: NewsIngestionCompletion = {
      status: 'failed',
      itemCount: feed?.items.length || 0,
      liveItemCount: feed?.liveItemCount || 0,
      connectedSourceCount: feed?.connectedSourceCount || 0,
      totalSourceCount: feed?.totalSourceCount || 0,
      generatedCount,
      failedCount: Math.max(1, failedCount),
      errors,
    };

    try {
      await completeNewsIngestion(input.runId, completion);
    } catch (completionError) {
      console.error('[news-ingestion] Failed to release ingestion lease', {
        runId: input.runId,
        message: safeErrorMessage(completionError),
      });
    }

    throw new Error(message);
  }
}
