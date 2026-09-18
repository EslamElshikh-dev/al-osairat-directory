import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DirectoryExplorer } from '@/components/directory-explorer';
import { BrandMark } from '@/components/site-shell';
import { categories, villages } from '@/lib/data';
import { queryDirectoryListings } from '@/lib/directory-query';
import { buildPageMetadata } from '@/lib/metadata';
import { getPublicDirectoryListings } from '@/lib/public-directory';
import { getEligibleServiceIntents } from '@/lib/programmatic-seo';
import { buildCollectionStructuredData, isFallbackScope, isFilteredDirectoryState } from '@/lib/seo-growth';

const directoryTitle = 'الدليل الشامل لخدمات وأنشطة العسيرات';
const directoryDescription = 'ابحث في دليل مركز العسيرات عن الأطباء والصيدليات والمحلات والحرفيين والمطاعم والمحامين وسائر الخدمات المحلية.';

type DirectorySearchParams = { q?: string; village?: string; page?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<DirectorySearchParams>;
}): Promise<Metadata> {
  const query = await searchParams;
  const page = Math.max(1, Number(query.page || 1) || 1);
  const searchQuery = String(query.q || '').trim();
  const village = String(query.village || '').trim();
  const hasFilters = Boolean(searchQuery || (village && village !== 'all'));
  const purePagination = !hasFilters && page > 1;
  if (page > 1) {
    const allListings = await getPublicDirectoryListings();
    const paginationResult = queryDirectoryListings(
      allListings,
      { query: query.q, village: query.village, page },
    );
    if (page > paginationResult.totalPages) notFound();
  }
  const title = purePagination
    ? `${directoryTitle} - الصفحة ${page.toLocaleString('ar-EG')}`
    : directoryTitle;
  const description = purePagination
    ? `${directoryDescription} الصفحة ${page.toLocaleString('ar-EG')} من نتائج الدليل.`
    : directoryDescription;

  return buildPageMetadata({
    title,
    description,
    path: '/directory',
    noIndex: hasFilters || page > 1,
    imageAlt: 'الدليل الشامل لخدمات وأنشطة العسيرات',
  });
}

export const dynamic = 'force-dynamic';

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<DirectorySearchParams>;
}) {
  const params = await searchParams;
  const filtered = isFilteredDirectoryState(params);
  const queryOptions = {
    query: params.q,
    village: params.village,
    page: Number(params.page || 1),
  };

  const allListings = await getPublicDirectoryListings();
  const result = queryDirectoryListings(allListings, queryOptions);
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);
  if (requestedPage > result.totalPages) notFound();
  const coreVillages = villages.filter((item) => !isFallbackScope(item.name));
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
    <main id="main-content" className="page-main interior-redesign directory-discovery-v4">
      <section className="catalog-hero catalog-hero--directory catalog-hero--search-first">
        <div className="shell catalog-hero__grid">
          <div className="catalog-hero__copy">
            <span className="catalog-hero__kicker"><BrandMark compact /> البحث المركزي</span>
            <h1>دليل العسيرات <em>كل اللي بتدور عليه أقرب</em></h1>
            <p>اكتب اسم النشاط أو الخدمة أو القرية، وهتدخل مباشرة على النتائج بدل اللف بين الأقسام.</p>

            <form className="catalog-hero-search" action="/directory" method="get" role="search">
              <label className="sr-only" htmlFor="hero-directory-search">ابحث في دليل العسيرات</label>
              <div className="catalog-hero-search__field">
                <span aria-hidden="true"><BrandMark compact /></span>
                <input
                  id="hero-directory-search"
                  name="q"
                  defaultValue={params.q || ''}
                  placeholder="مثال: دكتور أسنان، صيدلية، كهربائي، مدرسة..."
                  inputMode="search"
                  autoComplete="off"
                />
                <button type="submit" className="button button--light">ابحث الآن</button>
              </div>
              {params.village && params.village !== 'all' && <input type="hidden" name="village" value={params.village} />}
            </form>

            <nav className="catalog-hero-villages" aria-label="قرى شائعة في الدليل">
              <span>أو اختَر القرية:</span>
              {coreVillages.slice(0, 6).map((village) => (
                <Link key={village.slug} href={`/directory?village=${encodeURIComponent(village.name)}`}>{village.name}</Link>
              ))}
              <Link href="/villages" className="catalog-hero-villages__all">كل القرى ←</Link>
            </nav>
          </div>

          <aside className="catalog-hero__summary" aria-label="ملخص الدليل">
            <span className="catalog-hero__summary-label">نظرة سريعة</span>
            <div className="catalog-hero__metrics">
              <span><b>{result.total.toLocaleString('ar-EG')}</b><small>نتيجة حالية</small></span>
              <span><b>{categories.length.toLocaleString('ar-EG')}</b><small>قسمًا</small></span>
              <span><b>{coreVillages.length.toLocaleString('ar-EG')}</b><small>قرى أساسية</small></span>
            </div>
            <div className="catalog-hero__quick-links catalog-hero__quick-links--discovery">
              {categories.slice(0, 6).map((category) => (
                <Link key={category.id} href={`/directory/${category.id}`}>{category.shortLabel}</Link>
              ))}
            </div>
            <Link href="#directory-results" className="catalog-hero__summary-cta">تصفح كل النتائج ↓</Link>
          </aside>
        </div>
      </section>

      <section id="directory-results" className="shell page-section interior-results-section directory-results-v4">
        <DirectoryExplorer
          query={params.q || ''}
          village={params.village || 'all'}
          result={result}
          pathname="/directory"
        />
      </section>

      {serviceIntents.length > 0 && (
        <section className="shell seo-growth-hub seo-growth-hub--compact" aria-labelledby="directory-service-intents-title">
          <div className="seo-growth-hub__heading">
            <span>بحث حسب الخدمة</span>
            <h2 id="directory-service-intents-title">صفحات متخصصة ببيانات كافية</h2>
            <p>من دون إنشاء صفحة لكل عبارة بحث، نعرض فقط التخصصات التي يتوافر لها عدد كافٍ من السجلات وبيانات مكتملة.</p>
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

      <section className="shell seo-growth-hub" aria-labelledby="directory-discovery-title">
        <div className="seo-growth-hub__heading">
          <span>روابط استكشاف مباشرة</span>
          <h2 id="directory-discovery-title">استكشف الدليل حسب القسم أو القرية</h2>
          <p>صفحات ثابتة تساعد الزائر ومحركات البحث على الانتقال بين أقسام دليل العسيرات وقراه من دون الاعتماد على نتائج البحث والمرشحات.</p>
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
