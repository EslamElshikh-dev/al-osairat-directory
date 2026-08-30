import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ListingCard } from '@/components/listing-card';
import { BrandMark } from '@/components/site-shell';
import { listings, villages } from '@/lib/data';
import { createDirectoryHref, DIRECTORY_PAGE_SIZE, mergeDirectoryListings } from '@/lib/directory-query';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { buildPageMetadata } from '@/lib/metadata';
import { getPublishedListings } from '@/lib/published-listings';
import {
  getEligibleServiceIntents,
  getProgrammaticCollectionStats,
  getServiceIntentById,
  getServiceIntentListings,
  getTopSubCategories,
  isProgrammaticCollectionEligible,
} from '@/lib/programmatic-seo';
import { buildCollectionStructuredData, isFallbackScope } from '@/lib/seo-growth';

type ServiceSearchParams = { page?: string };

// A service intent may become eligible from newly published database records.
// Runtime eligibility prevents stale static params from turning a valid URL into 404.
export const dynamicParams = true;

export function generateStaticParams() {
  return getEligibleServiceIntents(listings).map(({ intent }) => ({ intent: intent.id }));
}

async function loadAllListings() {
  const [publishedListings, baseListings] = await Promise.all([
    getPublishedListings(),
    applyListingOverrides(listings),
  ]);
  return mergeDirectoryListings(baseListings, publishedListings);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ intent: string }>;
  searchParams: Promise<ServiceSearchParams>;
}): Promise<Metadata> {
  const [{ intent: intentId }, query] = await Promise.all([params, searchParams]);
  const intent = getServiceIntentById(intentId);
  if (!intent) return {};

  const allListings = await loadAllListings();
  const matched = getServiceIntentListings(allListings, intent);
  const eligible = isProgrammaticCollectionEligible(matched);
  const page = Math.max(1, Number(query.page || 1) || 1);
  const totalPages = Math.max(1, Math.ceil(matched.length / DIRECTORY_PAGE_SIZE));
  if (page > totalPages) notFound();
  const pathname = `/services/${intent.id}`;

  return buildPageMetadata({
    title: intent.title,
    description: intent.description,
    path: pathname,
    noIndex: !eligible || page > 1,
    imageAlt: `${intent.label} في دليل العسيرات`,
  });
}

export const dynamic = 'force-dynamic';

export default async function ServiceIntentPage({
  params,
  searchParams,
}: {
  params: Promise<{ intent: string }>;
  searchParams: Promise<ServiceSearchParams>;
}) {
  const [{ intent: intentId }, query] = await Promise.all([params, searchParams]);
  const intent = getServiceIntentById(intentId);
  if (!intent) notFound();

  const allListings = await loadAllListings();
  const matched = getServiceIntentListings(allListings, intent);
  if (!isProgrammaticCollectionEligible(matched)) notFound();

  const stats = getProgrammaticCollectionStats(matched);
  const requestedPage = Math.max(1, Number(query.page || 1) || 1);
  const totalPages = Math.max(1, Math.ceil(matched.length / DIRECTORY_PAGE_SIZE));
  if (requestedPage > totalPages) notFound();
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * DIRECTORY_PAGE_SIZE;
  const pageItems = matched.slice(start, start + DIRECTORY_PAGE_SIZE);
  const pathname = `/services/${intent.id}`;
  const topSpecialties = getTopSubCategories(matched, 8);
  const villageSummary = villages
    .filter((village) => !isFallbackScope(village.name))
    .map((village) => ({ village, count: matched.filter((listing) => listing.village === village.name).length }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.village.name.localeCompare(b.village.name, 'ar'));
  const relatedIntents = getEligibleServiceIntents(allListings).filter(({ intent: candidate }) => candidate.id !== intent.id);
  const structuredData = buildCollectionStructuredData({
    title: intent.label,
    description: intent.description,
    path: pathname,
    items: pageItems,
    totalItems: matched.length,
    page,
    pageSize: DIRECTORY_PAGE_SIZE,
    breadcrumbs: [
      { name: 'الرئيسية', path: '' },
      { name: 'الخدمات', path: '/services' },
      { name: intent.singularLabel, path: pathname },
    ],
  });

  return (
    <main id="main-content" className="page-main interior-redesign">
      <section className="catalog-hero catalog-hero--category">
        <div className="shell catalog-hero__grid">
          <div className="catalog-hero__copy">
            <nav className="breadcrumbs" aria-label="مسار التنقل"><Link href="/services">الخدمات</Link><span>/</span><span>{intent.singularLabel}</span></nav>
            <span className="catalog-hero__kicker"><BrandMark compact /> تخصص محلي</span>
            <h1>{intent.singularLabel} <em>في العسيرات</em></h1>
            <p>{intent.description}</p>
            <div className="catalog-hero__actions">
              <Link href="#service-results" className="button button--light">عرض النتائج</Link>
              <Link href={`/directory/${intent.category}`} className="button button--outline-light">كل نتائج القسم</Link>
            </div>
          </div>
          <aside className="catalog-hero__summary" aria-label={`ملخص ${intent.label}`}>
            <span className="catalog-hero__summary-label">بيانات الصفحة</span>
            <div className="catalog-hero__metrics">
              <span><b>{stats.total.toLocaleString('ar-EG')}</b><small>سجل مطابق</small></span>
              <span><b>{stats.villages.toLocaleString('ar-EG')}</b><small>نطاق محلي</small></span>
              <span><b>{stats.contactable.toLocaleString('ar-EG')}</b><small>وسيلة تواصل</small></span>
            </div>
          </aside>
        </div>
      </section>

      <section className="shell seo-growth-hub seo-growth-hub--compact" aria-labelledby="service-authority-title">
        <div className="seo-growth-hub__heading">
          <span>صفحة متخصصة وليست فلترًا مؤرشفًا</span>
          <h2 id="service-authority-title">معلومات تساعدك قبل التواصل</h2>
          <p>{intent.intro}</p>
          <p>{intent.guidance}</p>
        </div>
        {topSpecialties.length > 0 && (
          <div className="seo-growth-hub__links" aria-label={`التخصصات المرتبطة بـ ${intent.singularLabel}`}>
            {topSpecialties.map((item) => (
              <span key={item.label} className="button button--ghost">{item.label} · {item.count.toLocaleString('ar-EG')}</span>
            ))}
          </div>
        )}
      </section>

      <section id="service-results" className="shell page-section interior-results-section">
        <div className="section-heading section-heading--compact interior-section-heading">
          <div><span className="eyebrow eyebrow--dark">النتائج المطابقة</span><h2>{intent.label}</h2></div>
          <span className="interior-section-heading__count">{matched.length.toLocaleString('ar-EG')} نتيجة</span>
        </div>
        <div className="listing-grid">{pageItems.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
        {totalPages > 1 && (
          <nav className="detail-actions detail-actions--pagination" aria-label={`صفحات ${intent.label}`}>
            {page > 1 && <Link className="button button--ghost" rel="prev" href={createDirectoryHref(pathname, { page: page - 1 })}>السابق</Link>}
            <span>صفحة {page.toLocaleString('ar-EG')} من {totalPages.toLocaleString('ar-EG')}</span>
            {page < totalPages && <Link className="button button--primary" rel="next" href={createDirectoryHref(pathname, { page: page + 1 })}>التالي</Link>}
          </nav>
        )}
      </section>

      {villageSummary.length > 0 && (
        <section className="shell seo-growth-hub" aria-labelledby="service-villages-title">
          <div className="seo-growth-hub__heading">
            <span>تغطية السجلات</span>
            <h2 id="service-villages-title">أماكن ظهور {intent.singularLabel} داخل الدليل</h2>
            <p>الروابط التالية تنقلك إلى صفحات القرى نفسها؛ وهي لا تعني أن مقدم الخدمة يغطي كل تابع داخل القرية ما لم يذكر سجله ذلك صراحة.</p>
          </div>
          <nav className="seo-growth-hub__links" aria-label={`قرى تحتوي على سجلات ${intent.singularLabel}`}>
            {villageSummary.map(({ village, count }) => (
              <Link key={village.slug} href={`/villages/${encodeURIComponent(village.slug)}`}>
                <span>{village.name}</span><small>{count.toLocaleString('ar-EG')} سجل</small>
              </Link>
            ))}
          </nav>
        </section>
      )}

      {relatedIntents.length > 0 && (
        <section className="shell seo-growth-hub seo-growth-hub--compact" aria-labelledby="related-services-title">
          <div className="seo-growth-hub__heading"><span>خدمات أخرى</span><h2 id="related-services-title">استكشف تخصصات محلية أخرى</h2></div>
          <nav className="seo-growth-hub__links" aria-label="خدمات أخرى في العسيرات">
            {relatedIntents.map(({ intent: related, listings: relatedListings }) => (
              <Link key={related.id} href={`/services/${related.id}`}><span>{related.label}</span><small>{relatedListings.length.toLocaleString('ar-EG')} سجل</small></Link>
            ))}
          </nav>
        </section>
      )}

      {page === 1 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />}
    </main>
  );
}
