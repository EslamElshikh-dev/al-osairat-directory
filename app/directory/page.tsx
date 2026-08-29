import type { Metadata } from 'next';
import Link from 'next/link';
import { DirectoryExplorer } from '@/components/directory-explorer';
import { BrandMark } from '@/components/site-shell';
import { categories, listings, villages } from '@/lib/data';
import { mergeDirectoryListings, queryDirectoryListings } from '@/lib/directory-query';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';

export const metadata: Metadata = {
  title: 'الدليل الشامل لخدمات وأنشطة العسيرات',
  description: 'ابحث في دليل مركز العسيرات عن الأطباء والصيدليات والمحلات والحرفيين والمطاعم والمحامين والخدمات.',
  alternates: { canonical: '/directory' },
};

export const dynamic = 'force-dynamic';

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; village?: string; page?: string }>;
}) {
  const params = await searchParams;
  const [publishedListings, baseListings] = await Promise.all([
    getPublishedListings(),
    applyListingOverrides(listings),
  ]);

  const allListings = mergeDirectoryListings(baseListings, publishedListings);
  const result = queryDirectoryListings(allListings, {
    query: params.q,
    village: params.village,
    page: Number(params.page || 1),
  });
  const coreVillages = villages.filter((item) => item.name !== 'مركز العسيرات').length;

  return (
    <main id="main-content" className="page-main interior-redesign">
      <section className="catalog-hero catalog-hero--directory">
        <div className="shell catalog-hero__grid">
          <div className="catalog-hero__copy">
            <span className="catalog-hero__kicker"><BrandMark compact /> البحث المركزي</span>
            <h1>الدليل الشامل <em>لمركز العسيرات</em></h1>
            <p>ابحث بالاسم أو التخصص أو الخدمة أو القرية، ثم صفِّ النتائج للوصول إلى الأنسب داخل نطاق العسيرات.</p>
            <div className="catalog-hero__actions">
              <Link href="#directory-results" className="button button--light">ابدأ البحث</Link>
              <Link href="/villages" className="button button--outline-light">استكشف القرى</Link>
            </div>
          </div>

          <aside className="catalog-hero__summary" aria-label="ملخص الدليل">
            <span className="catalog-hero__summary-label">نظرة سريعة</span>
            <div className="catalog-hero__metrics">
              <span><b>{result.total.toLocaleString('ar-EG')}</b><small>نتيجة حالية</small></span>
              <span><b>{categories.length.toLocaleString('ar-EG')}</b><small>قسمًا</small></span>
              <span><b>{coreVillages.toLocaleString('ar-EG')}</b><small>قرى أساسية</small></span>
            </div>
            <div className="catalog-hero__quick-links">
              {categories.slice(0, 4).map((category) => (
                <Link key={category.id} href={`/directory/${category.id}`}>{category.shortLabel}</Link>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section id="directory-results" className="shell page-section interior-results-section">
        <DirectoryExplorer
          query={params.q || ''}
          village={params.village || 'all'}
          result={result}
          pathname="/directory"
        />
      </section>
    </main>
  );
}
