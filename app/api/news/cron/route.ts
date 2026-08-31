import { revalidatePath, revalidateTag } from 'next/cache';
import { createHash, timingSafeEqual } from 'node:crypto';
import { runClaimedNewsIngestion } from '@/lib/news-ingestion';
import {
  canWriteNewsDatabase,
  claimNewsIngestion,
  NEWS_DATABASE_CACHE_TAG,
} from '@/lib/news-persistence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const EXPECTED_TOKEN_SHA256 = '9005b67e2135db28cc45fb788271755db56243e2393bed17e2cfb49d71f9ce9a';

function authorized(request: Request) {
  const token = request.headers.get('x-news-cron-token')?.trim() || '';
  if (token.length < 32 || token.length > 256) return false;
  const actual = Buffer.from(createHash('sha256').update(token).digest('hex'));
  const expected = Buffer.from(EXPECTED_TOKEN_SHA256);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });
  if (!canWriteNewsDatabase()) return Response.json({ ok: false, reason: 'database-write-unavailable' }, { status: 503 });

  try {
    const runId = await claimNewsIngestion('cron', 20);
    if (!runId) return Response.json({ ok: true, scheduled: false, reason: 'fresh-or-running' }, { status: 202 });

    const result = await runClaimedNewsIngestion({ runId, trigger: 'cron' });
    revalidateTag(NEWS_DATABASE_CACHE_TAG, { expire: 0 });
    revalidatePath('/news');
    revalidatePath('/');

    return Response.json({
      ok: true,
      status: result.status,
      itemCount: result.itemCount,
      liveItemCount: result.liveItemCount,
      connectedSourceCount: result.connectedSourceCount,
      totalSourceCount: result.totalSourceCount,
      failedCount: result.failedCount,
    });
  } catch (error) {
    console.error('[news-cron] ingestion failed', {
      message: error instanceof Error ? error.message.slice(0, 240) : 'Unknown error',
    });
    return Response.json({ ok: false, error: 'News ingestion failed' }, { status: 500 });
  }
}
