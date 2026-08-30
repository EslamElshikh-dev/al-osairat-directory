import { revalidatePath, revalidateTag } from 'next/cache';
import { after } from 'next/server';
import { sameOrigin } from '@/lib/auth/supabase-rest';
import { runClaimedNewsIngestion } from '@/lib/news-ingestion';
import {
  canWriteNewsDatabase,
  claimNewsIngestion,
  NEWS_DATABASE_CACHE_TAG,
} from '@/lib/news-persistence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  if (!canWriteNewsDatabase()) {
    return new Response(null, { status: 204 });
  }

  try {
    const runId = await claimNewsIngestion('visit', 25);
    if (!runId) {
      return Response.json({ ok: true, scheduled: false, reason: 'fresh-or-running' }, { status: 202 });
    }

    after(async () => {
      try {
        const result = await runClaimedNewsIngestion({ runId, trigger: 'visit' });
        revalidateTag(NEWS_DATABASE_CACHE_TAG, { expire: 0 });
        revalidatePath('/news');
        revalidatePath('/');
        console.info('[news-ingestion] Visit refresh completed', {
          runId,
          status: result.status,
          itemCount: result.itemCount,
          generatedCount: result.generatedCount,
          failedCount: result.failedCount,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'News ingestion failed';
        console.error('[news-ingestion] Visit refresh failed', { runId, message });
      }
    });

    return Response.json({ ok: true, scheduled: true, runId }, { status: 202 });
  } catch {
    return Response.json({ ok: false, error: 'Refresh unavailable' }, { status: 503 });
  }
}
