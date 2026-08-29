import type { Metadata } from 'next';
import Link from 'next/link';
import { DirectoryExplorer } from '@/components/directory-explorer';
import { BrandMark } from '@/components/site-shell';
import { categories, listings, villages } from '@/lib/data';
import { mergeDirectoryListings, queryDirectoryListings } from '@/lib/directory-query';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
import { getEligibleServiceIntents } from '@/lib/programmatic-seo';
import { buildCollectionStructuredData, isFilteredDirectoryState } from '@/lib/seo-growth';

const directoryTitle = 'الدليل الشامل لخدمات وأنشطة العسيرات';
const directoryDescription = 'ابحث في دليل مركز العسيرات عن الأطباء والصيدليات والمحلات والحرفيين والمطاعم والمحامين والخدمات.';

type DirectorySearchParams = { q?: string; village?: string; page?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<DirectorySearchParams>;
}): Promise<Metadata> {
  const query = await searchParams;
  const filtered = isFilteredDirectoryState(query);
  return {
    title: directoryTitle,
    description: directoryDescription,
    alternates: { canonical: '/directory' },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export const dynamic = 'force-dynamic';

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<DirectorySearchParams>;
}) {
  const params = await searchParams;
  const filtered = isFilteredDirectoryState(params);
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
  const coreVillages = villages.filter((item) => item.name !== 'مركز العسيرات');
  const serviceIntents = getEligibleServiceIntents(allListings);
  const collectionSchema = buildCollectionStructuredData({
    title: directoryTitle,
    description: directoryDescription,
    path: '/directory',
    items: result.items,
    totalItems: result.total,
    page: result.page,
    pageSize: result.pageSize,
    breadcrumbs: [
      { name: 'الرئيسية', path: '' },
      { name: 'الدليل', path: '/directory' },
    ],
  });

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
              <span><b>{coreVillages.length.toLocaleString('ar-EG')}</b><small>قرى أساسية</small></span>
            </div>
            <div className="catalog-hero__quick-links">
              {categories.slice(0, 4).map((category) => (
                <Link key={category.id} href={`/directory/${category.id}`}>{category.shortLabel}</Link>
              ))}
            </div>
          </aside>
        </div>
      </section>

      {serviceIntents.length > 0 && (
        <section className="shell seo-growth-hub seo-growth-hub--compact" aria-labelledby="directory-service-intents-title">
          <div className="seo-growth-hub__heading">
            <span>بحث حسب الخدمة</span>
            <h2 id="directory-service-intents-title">صفحات متخصصة ببيانات كافية</h2>
            <p>بدل أرشفة كل عبارة بحث أو فلتر، نعرض فقط الصفحات المتخصصة التي تجاوزت حدًا أدنى من السجلات واكتمال البيانات.</p>
          </div>
          <nav className="seo-growth-hub__links" aria-label="خدمات متخصصة في دليل العسيرات">
            {serviceIntents.map(({ intent, listings: matched }) => (
              <Link key={intent.id} href={`/services/${intent.id}`}>
                <span>{intent.label}</span><small>{matched.length.toLocaleString('ar-EG')} سجل</small>
              </Link>
            ))}
            <Link href="/services"><span>كل الصفحات المتخصصة</span><small>استكشف حسب التخصص</small></Link>
          </nav>
        </section>
      )}

      <section id="directory-results" className="shell page-section interior-results-section">
        <DirectoryExplorer
          query={params.q || ''}
          village={params.village || 'all'}
          result={result}
          pathname="/directory"
        />
      </section>

      <section className="shell seo-growth-hub" aria-labelledby="directory-discovery-title">
        <div className="seo-growth-hub__heading">
          <span>روابط استكشاف مباشرة</span>
          <h2 id="directory-discovery-title">استكشف الدليل حسب القسم أو القرية</h2>
          <p>صفحات ثابتة تساعد الزائر ومحركات البحث على الانتقال بين أهم كيانات دليل العسيرات بدون الاعتماد على نتائج البحث والفلاتر.</p>
        </div>
        <div className="seo-growth-hub__columns">
          <nav aria-label="أقسام دليل العسيرات">
            <strong>الأقسام</strong>
            <div>{categories.filter((category) => category.id !== 'emergency').map((category) => <Link key={category.id} href={`/directory/${category.id}`}>{category.label}</Link>)}</div>
          </nav>
          <nav aria-label="قرى مركز العسيرات">
            <strong>القرى</strong>
            <div>{coreVillages.map((village) => <Link key={village.slug} href={`/villages/${encodeURIComponent(village.slug)}`}>دليل {village.name}</Link>)}</div>
          </nav>
        </div>
      </section>

      {!filtered && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />}
    </main>
  );
}
