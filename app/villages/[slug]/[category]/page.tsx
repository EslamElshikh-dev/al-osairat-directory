import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CategoryVisual } from '@/components/category-visual';
import { ListingCard } from '@/components/listing-card';
import { BrandMark } from '@/components/site-shell';
import { categories, listings } from '@/lib/data';
import { createDirectoryHref, DIRECTORY_PAGE_SIZE, mergeDirectoryListings } from '@/lib/directory-query';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
import {
  categorySearchProfiles,
  getEligibleVillageCategoryLandings,
  getProgrammaticCollectionStats,
  getTopSubCategories,
  getVillageCategoryListings,
  isVillageCategoryLandingEligible,
  resolveVillageAndCategory,
  villageCategoryLandingPath,
} from '@/lib/programmatic-seo';
import { buildCollectionStructuredData } from '@/lib/seo-growth';
import { normalizeRouteSlug, siteConfig } from '@/lib/site';
import type { DirectoryCategory } from '@/lib/types';

type LocalSearchParams = { page?: string };

export const dynamicParams = false;

export function generateStaticParams() {
  return getEligibleVillageCategoryLandings(listings).map(({ village, category }) => ({
    slug: village.slug,
    category: category.id,
  }));
}

async function loadAllListings() {
  const [publishedListings, baseListings] = await Promise.all([
    getPublishedListings(),
    applyListingOverrides(listings),
  ]);
  return mergeDirectoryListings(baseListings, publishedListings);
}

function localQueryLabel(category: DirectoryCategory, villageName: string, fallback: string) {
  const primary = categorySearchProfiles[category]?.primaryQuery;
  return primary ? primary.replace('في العسيرات', `في ${villageName}`) : `${fallback} في ${villageName}`;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; category: string }>;
  searchParams: Promise<LocalSearchParams>;
}): Promise<Metadata> {
  const [{ slug, category: categoryId }, query] = await Promise.all([params, searchParams]);
  const resolved = resolveVillageAndCategory(normalizeRouteSlug(slug), categoryId);
  if (!resolved) return {};

  const allListings = await loadAllListings();
  const eligible = isVillageCategoryLandingEligible(allListings, resolved.village.name, resolved.category.id);
  const localListings = getVillageCategoryListings(allListings, resolved.village.name, resolved.category.id);
  const page = Math.max(1, Number(query.page || 1) || 1);
  const label = localQueryLabel(resolved.category.id, resolved.village.name, resolved.category.shortLabel);
  const pathname = villageCategoryLandingPath(resolved.village, resolved.category);
  const description = `${label}: ${localListings.length.toLocaleString('ar-EG')} سجلًا محليًا منشورًا مع بيانات التواصل والموقع المتاحة داخل دليل العسيرات.`;

  return {
    title: `${label} - دليل العسيرات`,
    description,
    alternates: { canonical: pathname },
    openGraph: {
      title: `${label} - دليل العسيرات`,
      description,
      url: `${siteConfig.url}${pathname}`,
    },
    ...(!eligible || page > 1 ? { robots: { index: false, follow: true } } : {}),
  };
}

export const dynamic = 'force-dynamic';

export default async function VillageCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; category: string }>;
  searchParams: Promise<LocalSearchParams>;
}) {
  const [{ slug, category: categoryId }, query] = await Promise.all([params, searchParams]);
  const resolved = resolveVillageAndCategory(normalizeRouteSlug(slug), categoryId);
  if (!resolved) notFound();

  const { village, category } = resolved;
  const allListings = await loadAllListings();
  if (!isVillageCategoryLandingEligible(allListings, village.name, category.id)) notFound();

  const localListings = getVillageCategoryListings(allListings, village.name, category.id);
  const stats = getProgrammaticCollectionStats(localListings);
  const topSpecialties = getTopSubCategories(localListings, 8);
  const requestedPage = Math.max(1, Number(query.page || 1) || 1);
  const totalPages = Math.max(1, Math.ceil(localListings.length / DIRECTORY_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * DIRECTORY_PAGE_SIZE;
  const pageItems = localListings.slice(start, start + DIRECTORY_PAGE_SIZE);
  const pathname = villageCategoryLandingPath(village, category);
  const label = localQueryLabel(category.id, village.name, category.shortLabel);
  const description = `${label}: نتائج محلية من السجلات المنشورة داخل ${village.name} مع ربط مباشر بصفحة القرية وقسم ${category.shortLabel}.`;
  const relatedCategories = categories
    .filter((candidate) => candidate.id !== category.id && candidate.id !== 'emergency')
    .filter((candidate) => isVillageCategoryLandingEligible(allListings, village.name, candidate.id))
    .map((candidate) => ({
      category: candidate,
      count: getVillageCategoryListings(allListings, village.name, candidate.id).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const structuredData = buildCollectionStructuredData({
    title: label,
    description,
    path: pathname,
    items: pageItems,
    totalItems: localListings.length,
    page,
    pageSize: DIRECTORY_PAGE_SIZE,
    breadcrumbs: [
      { name: 'الرئيسية', path: '' },
      { name: 'قرى العسيرات', path: '/villages' },
      { name: village.name, path: `/villages/${encodeURIComponent(village.slug)}` },
      { name: category.shortLabel, path: pathname },
    ],
  });

  return (
    <main id="main-content" className="page-main interior-redesign">
      <section className="village-hero village-hero--premium">
        <div className="shell village-hero__premium-grid">
          <div className="village-hero__content">
            <nav className="breadcrumbs" aria-label="مسار التنقل">
              <Link href="/villages">القرى</Link><span>/</span>
              <Link href={`/villages/${encodeURIComponent(village.slug)}`}>{village.name}</Link><span>/</span>
              <span>{category.shortLabel}</span>
            </nav>
            <div className="village-hero__identity">
              <CategoryVisual category={category.id} size="lg" />
              <div><span className="eyebrow">دليل محلي متخصص</span><span className="village-hero__scope">{village.name} · مركز العسيرات</span></div>
            </div>
            <h1>{label}</h1>
            <p>{description}</p>
            <div className="catalog-hero__actions">
              <Link href="#local-results" className="button button--light">عرض النتائج</Link>
              <Link href={`/villages/${encodeURIComponent(village.slug)}`} className="button button--outline-light">دليل {village.name}</Link>
            </div>
          </div>
          <aside className="village-hero__summary" aria-label={`ملخص ${label}`}>
            <span className="catalog-hero__summary-label">ملخص الصفحة</span>
            <div className="catalog-hero__metrics">
              <span><b>{stats.total.toLocaleString('ar-EG')}</b><small>سجل مؤهل</small></span>
              <span><b>{stats.contactable.toLocaleString('ar-EG')}</b><small>وسيلة تواصل</small></span>
              <span><b>{stats.withMaps.toLocaleString('ar-EG')}</b><small>مرجع خرائط</small></span>
            </div>
          </aside>
        </div>
      </section>

      <section className="shell seo-growth-hub seo-growth-hub--compact" aria-labelledby="local-context-title">
        <div className="seo-growth-hub__heading">
          <span><BrandMark compact /> سياق محلي حقيقي</span>
          <h2 id="local-context-title">عن {category.shortLabel} في {village.name}</h2>
          <p>هذه الصفحة لا تُنشأ لمجرد الجمع بين اسم خدمة واسم قرية؛ ظهرت لأنها تجاوزت حدًا أدنى من عدد السجلات واكتمال البيانات، وتعرض فقط السجلات المؤهلة من نفس القرية والقسم.</p>
          {village.localities.length > 0 && <p>ترتبط {village.name} في هيكل الدليل بتوابع ونجوع مسجلة بالاسم مثل {village.localities.slice(0, 5).join('، ')}. وجودها هنا يصف النطاق الجغرافي للقرية ولا يعني أن كل مقدم خدمة يغطي جميع هذه التوابع.</p>}
        </div>
        {topSpecialties.length > 0 && (
          <div className="seo-growth-hub__links" aria-label={`تخصصات ${category.shortLabel} في ${village.name}`}>
            {topSpecialties.map((item) => <span key={item.label} className="button button--ghost">{item.label} · {item.count.toLocaleString('ar-EG')}</span>)}
          </div>
        )}
      </section>

      <section id="local-results" className="shell page-section interior-results-section">
        <div className="section-heading section-heading--compact interior-section-heading">
          <div><span className="eyebrow eyebrow--dark">نتائج القرية</span><h2>{label}</h2></div>
          <span className="interior-section-heading__count">{localListings.length.toLocaleString('ar-EG')} نتيجة</span>
        </div>
        <div className="listing-grid">{pageItems.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
        {totalPages > 1 && (
          <nav className="detail-actions detail-actions--pagination" aria-label={`صفحات ${label}`}>
            {page > 1 && <Link className="button button--ghost" rel="prev" href={createDirectoryHref(pathname, { page: page - 1 })}>السابق</Link>}
            <span>صفحة {page.toLocaleString('ar-EG')} من {totalPages.toLocaleString('ar-EG')}</span>
            {page < totalPages && <Link className="button button--primary" rel="next" href={createDirectoryHref(pathname, { page: page + 1 })}>التالي</Link>}
          </nav>
        )}
      </section>

      <section className="shell seo-growth-hub" aria-labelledby="local-links-title">
        <div className="seo-growth-hub__heading"><span>روابط مرتبطة</span><h2 id="local-links-title">استكشف {village.name} وخدمات العسيرات</h2></div>
        <nav className="seo-growth-hub__links" aria-label={`روابط مرتبطة بـ ${village.name}`}>
          <Link href={`/villages/${encodeURIComponent(village.slug)}`}><span>كل خدمات {village.name}</span><small>صفحة القرية</small></Link>
          <Link href={`/directory/${category.id}`}><span>{category.shortLabel} في العسيرات</span><small>صفحة القسم</small></Link>
          {relatedCategories.map(({ category: related, count }) => (
            <Link key={related.id} href={villageCategoryLandingPath(village, related)}><span>{related.shortLabel} في {village.name}</span><small>{count.toLocaleString('ar-EG')} سجل</small></Link>
          ))}
        </nav>
      </section>

      {page === 1 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />}
    </main>
  );
}
