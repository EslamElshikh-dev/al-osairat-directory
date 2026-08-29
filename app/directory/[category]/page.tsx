import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DirectoryExplorer } from '@/components/directory-explorer';
import { CategoryVisual } from '@/components/category-visual';
import { BrandMark } from '@/components/site-shell';
import { categories, categoryById, listings, villages, type DirectoryCategory } from '@/lib/data';
import { mergeDirectoryListings, queryDirectoryListings } from '@/lib/directory-query';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
import { siteConfig } from '@/lib/site';

export function generateStaticParams() {
  return categories.map((category) => ({ category: category.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const info = categoryById[category as DirectoryCategory];
  if (!info) return {};
  return {
    title: `${info.label} في العسيرات`,
    description: info.description,
    alternates: { canonical: `/directory/${info.id}` },
    openGraph: { title: `${info.label} في العسيرات`, description: info.description, url: `${siteConfig.url}/directory/${info.id}` },
  };
}

export const dynamic = 'force-dynamic';

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ q?: string; village?: string; page?: string }>;
}) {
  const { category } = await params;
  const query = await searchParams;
  const info = categoryById[category as DirectoryCategory];
  if (!info) notFound();

  const [publishedListings, baseListings] = await Promise.all([
    getPublishedListings({ category: info.id }),
    applyListingOverrides(listings),
  ]);

  const allListings = mergeDirectoryListings(baseListings, publishedListings);
  const result = queryDirectoryListings(allListings, {
    category: info.id,
    query: query.q,
    village: query.village,
    page: Number(query.page || 1),
  });
  const pathname = `/directory/${info.id}`;
  const categoryListings = allListings.filter((item) => item.category === info.id);
  const villageCount = new Set(categoryListings.map((item) => item.village).filter(Boolean)).size;

  return (
    <main id="main-content" className="page-main interior-redesign">
      <section className="catalog-hero catalog-hero--category">
        <div className="shell catalog-hero__grid">
          <div className="catalog-hero__copy">
            <div className="catalog-hero__category-identity">
              <CategoryVisual category={info.id} size="lg" />
              <div>
                <span className="catalog-hero__kicker"><BrandMark compact /> قسم متخصص</span>
                <span className="catalog-hero__category-name">{info.shortLabel}</span>
              </div>
            </div>
            <h1>{info.label} <em>في العسيرات</em></h1>
            <p>{info.description}</p>
            <div className="catalog-hero__actions">
              <Link href="#directory-results" className="button button--light">عرض النتائج</Link>
              <Link href="/directory" className="button button--outline-light">كل أقسام الدليل</Link>
            </div>
          </div>

          <aside className="catalog-hero__summary" aria-label={`ملخص قسم ${info.shortLabel}`}>
            <span className="catalog-hero__summary-label">ملخص القسم</span>
            <div className="catalog-hero__metrics catalog-hero__metrics--two">
              <span><b>{result.total.toLocaleString('ar-EG')}</b><small>نتيجة مطابقة</small></span>
              <span><b>{villageCount.toLocaleString('ar-EG')}</b><small>نطاقًا محليًا</small></span>
            </div>
            <div className="catalog-hero__scope-note">
              <strong>{query.village && query.village !== 'all' ? query.village : 'كل نطاق العسيرات'}</strong>
              <span>يمكن تغيير القرية من أدوات التصفية بالأسفل.</span>
            </div>
          </aside>
        </div>
      </section>

      <section id="directory-results" className="shell page-section interior-results-section">
        <DirectoryExplorer
          category={info.id}
          query={query.q || ''}
          village={query.village || 'all'}
          result={result}
          pathname={pathname}
        />
      </section>
    </main>
  );
}
