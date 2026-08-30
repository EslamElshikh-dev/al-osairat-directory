import { timingSafeEqual } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { runClaimedNewsIngestion } from '@/lib/news-ingestion';
import {
  canWriteNewsDatabase,
  claimNewsIngestion,
  NEWS_DATABASE_CACHE_TAG,
} from '@/lib/news-persistence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get('authorization') || '';
  if (!secret || !authorization.startsWith('Bearer ')) return false;

  const supplied = authorization.slice(7);
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length
    && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

function refreshNewsPages() {
  revalidateTag(NEWS_DATABASE_CACHE_TAG, { expire: 0 });
  revalidatePath('/news');
  revalidatePath('/');
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!canWriteNewsDatabase()) {
    return Response.json({ ok: false, error: 'News database is not configured' }, { status: 503 });
  }

  try {
    const runId = await claimNewsIngestion('cron', 20);
    if (!runId) {
      return Response.json({ ok: true, skipped: true, reason: 'fresh-or-running' });
    }

    const result = await runClaimedNewsIngestion({ runId, trigger: 'cron' });
    refreshNewsPages();
    console.info('[news-ingestion] Cron completed', {
      runId,
      status: result.status,
      itemCount: result.itemCount,
      generatedCount: result.generatedCount,
      failedCount: result.failedCount,
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'News ingestion failed';
    console.error('[news-ingestion] Cron failed', { message });
    return Response.json({ ok: false, error: 'News ingestion failed' }, { status: 500 });
  }
}
