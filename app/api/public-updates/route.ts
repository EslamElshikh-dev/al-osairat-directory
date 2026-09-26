import { NextResponse } from 'next/server';
import { blogArticles } from '@/lib/blog-published';
import { getLocalJobs } from '@/lib/jobs';
import { getStoredLocalNews } from '@/lib/news-persistence';
import { newsItemPath } from '@/lib/news';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Update = {
  id: string;
  type: 'news' | 'job' | 'article';
  title: string;
  summary: string;
  href: string;
  publishedAt: string;
};

export async function GET() {
  const [jobsResult, newsResult] = await Promise.all([
    getLocalJobs(),
    getStoredLocalNews(12).catch(() => undefined),
  ]);
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const recent = (date: string) => {
    const time = Date.parse(date);
    return Number.isFinite(time) && time >= cutoff && time <= Date.now() + 60_000;
  };
  const updates: Update[] = [
    ...jobsResult.jobs
      .filter((job) => job.kind === 'offer' && recent(job.published_at))
      .map((job) => ({
        id: `job:${job.id}`, type: 'job' as const,
        title: job.title.slice(0, 140),
        summary: `فرصة عمل في ${job.village || 'سوهاج'}`,
        href: `/jobs#job-${encodeURIComponent(job.id)}`,
        publishedAt: job.published_at,
      })),
    ...(newsResult?.items || [])
      .filter((item) => recent(item.publishedAt))
      .map((item) => ({
        id: `news:${item.id}`, type: 'news' as const,
        title: item.title.slice(0, 140),
        summary: `خبر من ${item.source}`,
        href: newsItemPath(item),
        publishedAt: item.publishedAt,
      })),
    ...blogArticles
      .filter((article) => recent(article.updatedAt || article.publishedAt))
      .map((article) => ({
        id: `article:${article.slug}:${article.updatedAt || article.publishedAt}`,
        type: 'article' as const,
        title: article.title.slice(0, 140),
        summary: 'من مدونة العسيرات',
        href: `/blog/${encodeURIComponent(article.slug)}`,
        publishedAt: article.updatedAt || article.publishedAt,
      })),
  ].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 9);
  return NextResponse.json({ updates }, {
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=300' },
  });
}
