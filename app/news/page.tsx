import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/metadata';
import { NEWS_DESCRIPTION, NEWS_KEYWORDS, NEWS_TITLE, NewsIndex } from './news-index';

export const revalidate = 1800;

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: NEWS_TITLE,
    description: NEWS_DESCRIPTION,
    path: '/news',
    imageAlt: 'أخبار العسيرات وقراها من المصادر الموثوقة',
  }),
  keywords: NEWS_KEYWORDS,
};

export default function NewsPage() {
  return <NewsIndex />;
}
