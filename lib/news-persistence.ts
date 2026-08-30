import 'server-only';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/auth/supabase-rest';
import type {
  GeneratedNewsEditorial,
  LocalNewsDetail,
  LocalNewsFeed,
  LocalNewsItem,
  NewsTopic,
} from '@/lib/news';

export const NEWS_DATABASE_CACHE_TAG = 'local-news-db';

type PublicNewsRow = {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  source: string;
  source_url: string;
  published_at: string;
  village: string;
  topic: string;
  origin: 'live' | 'archive';
  status: 'published' | 'hidden';
  editorial_status: 'source-only' | 'pending' | 'ready' | 'insufficient' | 'failed';
  source_excerpt: string | null;
  generated_editorial: unknown;
  first_seen_at: string;
  last_seen_at: string;
  updated_at: string;
};

type PublicNewsStateRow = {
  last_completed_at: string | null;
  last_status: 'running' | 'succeeded' | 'partial' | 'failed' | null;
  last_item_count: number;
  last_live_item_count: number;
  last_connected_source_count: number;
  total_source_count: number;
  last_generated_count: number;
  last_failed_count: number;
};

export type StoredNewsProcessingState = {
  id: string;
  editorialStatus: PublicNewsRow['editorial_status'];
  sourceHash?: string;
  sourceFetchedAt?: string;
};

export type NewsIngestionCompletion = {
  status: 'succeeded' | 'partial' | 'failed';
  itemCount: number;
  liveItemCount: number;
  connectedSourceCount: number;
  totalSourceCount: number;
  generatedCount: number;
  failedCount: number;
  errors?: Array<{ id?: string; stage: string; message: string }>;
};

const PUBLIC_LIST_COLUMNS = [
  'id', 'title', 'summary', 'url', 'source', 'source_url', 'published_at', 'village', 'topic',
  'origin', 'status', 'editorial_status', 'source_excerpt', 'first_seen_at', 'last_seen_at', 'updated_at',
].join(',');

const PUBLIC_DETAIL_COLUMNS = `${PUBLIC_LIST_COLUMNS},generated_editorial`;
const PUBLIC_STATE_COLUMNS = [
  'last_completed_at', 'last_status', 'last_item_count', 'last_live_item_count',
  'last_connected_source_count', 'total_source_count', 'last_generated_count', 'last_failed_count',
].join(',');

function serviceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || process.env.SUPABASE_SECRET_KEY?.trim()
    || '';
}

function newsDatabaseEnabled() {
  return process.env.NEWS_DATABASE_ENABLED?.trim().toLowerCase() !== 'false';
}

export function canWriteNewsDatabase() {
  return newsDatabaseEnabled() && Boolean(serviceRoleKey());
}

function headers(key: string, prefer?: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

function isGeneratedEditorial(value: unknown): value is GeneratedNewsEditorial {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return candidate.kind === 'generated-coverage'
    && typeof candidate.lead === 'string'
    && Array.isArray(candidate.body)
    && candidate.body.every((entry) => typeof entry === 'string')
    && Array.isArray(candidate.verifiedFacts)
    && candidate.verifiedFacts.every((entry) => typeof entry === 'string')
    && (candidate.coverageLevel === 'comprehensive' || candidate.coverageLevel === 'limited')
    && typeof candidate.generatedAt === 'string';
}

function mapPublicNewsRow(row: PublicNewsRow): LocalNewsDetail {
  const generatedEditorial = isGeneratedEditorial(row.generated_editorial)
    ? row.generated_editorial
    : undefined;

  return {
    id: row.id,
    title: row.title,
    ...(row.summary ? { summary: row.summary } : {}),
    url: row.url,
    source: row.source,
    sourceUrl: row.source_url,
    publishedAt: row.published_at,
    village: row.village,
    topic: row.topic as NewsTopic,
    origin: row.origin,
    ...(row.source_excerpt ? { sourceExcerpt: row.source_excerpt } : {}),
    ...(generatedEditorial ? { generatedEditorial } : {}),
    editorialStatus: row.editorial_status,
    persisted: true,
  };
}

async function readRows<T>(path: string): Promise<T[] | undefined> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: headers(SUPABASE_PUBLISHABLE_KEY),
    next: { revalidate: 300, tags: [NEWS_DATABASE_CACHE_TAG] },
  });

  if (response.status === 404) return undefined;
  if (!response.ok) {
    const message = (await response.text()).slice(0, 240);
    if (message.includes('PGRST205') || message.includes('schema cache')) return undefined;
    throw new Error(`News database read failed (${response.status})`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data as T[] : undefined;
}

async function serviceRequest<T>(path: string, init: RequestInit = {}, prefer?: string): Promise<T> {
  const key = serviceRoleKey();
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers(key, prefer), ...(init.headers || {}) },
    cache: 'no-store',
  });

  const text = await response.text();
  if (!response.ok) {
    let message = `Supabase request failed (${response.status})`;
    try {
      const parsed = JSON.parse(text) as { message?: unknown; details?: unknown };
      if (typeof parsed.message === 'string') message = parsed.message.slice(0, 260);
      else if (typeof parsed.details === 'string') message = parsed.details.slice(0, 260);
    } catch {
      // Keep the status-only error so secrets and source material never enter logs.
    }
    throw new Error(message);
  }

  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function getStoredLocalNews(limit = 36): Promise<LocalNewsFeed | undefined> {
  if (!newsDatabaseEnabled()) return undefined;
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const [itemRows, stateRows] = await Promise.all([
    readRows<PublicNewsRow>(
      `news_items?select=${PUBLIC_LIST_COLUMNS}&status=eq.published&order=published_at.desc&limit=${safeLimit}`,
    ),
    readRows<PublicNewsStateRow>(
      `news_ingestion_state?select=${PUBLIC_STATE_COLUMNS}&singleton=eq.true&limit=1`,
    ),
  ]);

  if (!itemRows?.length) return undefined;
  const state = stateRows?.[0];
  const items = itemRows.map(mapPublicNewsRow);

  return {
    items,
    liveItemCount: state?.last_live_item_count ?? items.filter((item) => item.origin === 'live').length,
    connectedSourceCount: state?.last_connected_source_count ?? 0,
    totalSourceCount: state?.total_source_count ?? 0,
    checkedAt: state?.last_completed_at || itemRows[0].last_seen_at || new Date().toISOString(),
    editorialReadyCount: itemRows.filter((row) => row.editorial_status === 'ready').length,
    storage: 'database',
  };
}

export async function getStoredLocalNewsItem(id: string): Promise<LocalNewsDetail | undefined> {
  if (!newsDatabaseEnabled()) return undefined;
  const rows = await readRows<PublicNewsRow>(
    `news_items?select=${PUBLIC_DETAIL_COLUMNS}&id=eq.${encodeURIComponent(id)}&status=eq.published&limit=1`,
  );
  return rows?.[0] ? mapPublicNewsRow(rows[0]) : undefined;
}

export async function claimNewsIngestion(
  trigger: 'cron' | 'visit' | 'manual',
  minimumIntervalMinutes = 25,
) {
  const runId = await serviceRequest<string | null>('rpc/claim_news_ingestion', {
    method: 'POST',
    body: JSON.stringify({
      p_trigger: trigger,
      p_min_interval_minutes: minimumIntervalMinutes,
    }),
  });
  return typeof runId === 'string' && runId ? runId : undefined;
}

export async function completeNewsIngestion(runId: string, result: NewsIngestionCompletion) {
  await serviceRequest<void>('rpc/complete_news_ingestion', {
    method: 'POST',
    body: JSON.stringify({
      p_run_id: runId,
      p_status: result.status,
      p_item_count: result.itemCount,
      p_live_item_count: result.liveItemCount,
      p_connected_source_count: result.connectedSourceCount,
      p_total_source_count: result.totalSourceCount,
      p_generated_count: result.generatedCount,
      p_failed_count: result.failedCount,
      p_error_summary: result.errors?.length ? result.errors.slice(0, 12) : null,
    }),
  });
}

export async function getStoredNewsProcessingState(ids: string[]) {
  if (!ids.length) return new Map<string, StoredNewsProcessingState>();
  const safeIds = ids.filter((id) => /^[a-z0-9-]{1,120}$/i.test(id)).slice(0, 100);
  if (!safeIds.length) return new Map<string, StoredNewsProcessingState>();

  const rows = await serviceRequest<Array<{
    id: string;
    editorial_status: PublicNewsRow['editorial_status'];
    source_hash: string | null;
    source_fetched_at: string | null;
  }>>(
    `news_items?select=id,editorial_status,source_hash,source_fetched_at&id=in.(${safeIds.join(',')})`,
  );

  return new Map(rows.map((row) => [row.id, {
    id: row.id,
    editorialStatus: row.editorial_status,
    ...(row.source_hash ? { sourceHash: row.source_hash } : {}),
    ...(row.source_fetched_at ? { sourceFetchedAt: row.source_fetched_at } : {}),
  }]));
}

export async function upsertDiscoveredNews(items: LocalNewsItem[], seenAt: string) {
  if (!items.length) return;
  const payload = items.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary || null,
    url: item.url,
    source: item.source,
    source_url: item.sourceUrl,
    published_at: item.publishedAt,
    village: item.village,
    topic: item.topic,
    origin: item.origin,
    status: 'published',
    last_seen_at: seenAt,
    updated_at: seenAt,
  }));

  await serviceRequest<void>('news_items?on_conflict=id', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, 'resolution=merge-duplicates,return=minimal');
}

export async function saveNewsProcessingResult(input: {
  id: string;
  sourceExcerpt?: string;
  sourceText?: string;
  sourceHash?: string;
  editorialStatus: PublicNewsRow['editorial_status'];
  generatedEditorial?: GeneratedNewsEditorial;
  error?: string;
  preserveExistingEditorial?: boolean;
}) {
  const now = new Date().toISOString();
  const payload = {
    source_excerpt: input.sourceExcerpt || null,
    source_text: input.sourceText || null,
    source_hash: input.sourceHash || null,
    source_fetched_at: now,
    updated_at: now,
    last_error: input.error?.slice(0, 500) || null,
    ...(!input.preserveExistingEditorial ? {
      editorial_status: input.editorialStatus,
      generated_editorial: input.generatedEditorial || null,
    } : {}),
  };

  await serviceRequest<void>(`news_items?id=eq.${encodeURIComponent(input.id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, 'return=minimal');
}

export async function touchNewsSource(id: string) {
  const now = new Date().toISOString();
  await serviceRequest<void>(`news_items?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ source_fetched_at: now, updated_at: now, last_error: null }),
  }, 'return=minimal');
}
