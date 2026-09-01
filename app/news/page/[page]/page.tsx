import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { buildPageMetadata } from '@/lib/metadata';
import { NEWS_DESCRIPTION, NEWS_KEYWORDS, NEWS_TITLE, NewsIndex } from '../../news-index';

export const revalidate = 1800;

type NewsArchivePageProps = {
  params: Promise<{ page: string }>;
};

function parsePage(value: string) {
  return /^[1-9]\d*$/.test(value) ? Number(value) : Number.NaN;
}

export function generateStaticParams() {
  return ['2', '3', '4', '5'].map((page) => ({ page }));
}

export async function generateMetadata({ params }: NewsArchivePageProps): Promise<Metadata> {
  const currentPage = parsePage((await params).page);
  const validPage = Number.isSafeInteger(currentPage) && currentPage > 1;

  return {
    ...buildPageMetadata({
      title: validPage ? `${NEWS_TITLE} - الصفحة ${currentPage}` : 'صفحة أخبار غير موجودة',
      description: validPage
        ? `${NEWS_DESCRIPTION} الصفحة ${currentPage} من التغطيات المرتبة زمنيًا.`
        : NEWS_DESCRIPTION,
      path: validPage ? `/news/page/${currentPage}` : '/news',
      noIndex: !validPage,
      imageAlt: 'أخبار العسيرات وقراها من المصادر الموثوقة',
    }),
    keywords: NEWS_KEYWORDS,
  };
}

export default async function NewsArchivePage({ params }: NewsArchivePageProps) {
  const rawPage = (await params).page;
  const currentPage = parsePage(rawPage);

  if (currentPage === 1) permanentRedirect('/news');
  if (!Number.isSafeInteger(currentPage) || currentPage < 2) notFound();

  return <NewsIndex page={currentPage} />;
}
