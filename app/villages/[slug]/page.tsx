import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categories, listings, villageBySlug, villages } from '@/lib/data';
import { createDirectoryHref, mergeDirectoryListings, queryDirectoryListings } from '@/lib/directory-query';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
import { ListingCard } from '@/components/listing-card';
import { CategoryVisual } from '@/components/category-visual';
import { BrandMark } from '@/components/site-shell';
import { isFilteredDirectoryState } from '@/lib/seo-growth';
import { normalizeRouteSlug, siteConfig } from '@/lib/site';

type VillageSearchParams = { page?: string };

export function generateStaticParams() {
  return villages.map((village) => ({ slug: village.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<VillageSearchParams>;
}): Promise<Metadata> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const village = villageBySlug[normalizeRouteSlug(slug)];
  if (!village) return {};
  const paginated = isFilteredDirectoryState(query);
  return {
    title: `دليل ${village.name} - مركز العسيرات`,
    description: `الخدمات والأنشطة والبيانات المحلية المنشورة في ${village.name} ضمن مركز العسيرات بمحافظة سوهاج.`,
    alternates: { canonical: `/villages/${village.slug}` },
    openGraph: { title: `دليل ${village.name} - مركز العسيرات`, description: village.description, url: `${siteConfig.url}/villages/${village.slug}` },
    ...(paginated ? { robots: { index: false, follow: true } } : {}),
  };
}

export const dynamic = 'force-dynamic';

export default async function VillagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<VillageSearchParams>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const paginated = isFilteredDirectoryState(query);
  const village = villageBySlug[normalizeRouteSlug(slug)];
  if (!village) notFound();

  const [publishedListings, overriddenListings] = await Promise.all([
    getPublishedListings({ village: village.name }),
    applyListingOverrides(listings),
  ]);

  const allListings = mergeDirectoryListings(overriddenListings, publishedListings);
  const villageListings = allListings.filter((item) => item.village === village.name && item.category !== 'emergency');
  const categorySummary = categories
    .map((category) => ({
      category,
      count: villageListings.filter((item) => item.category === category.id).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const result = queryDirectoryListings(allListings, {
    village: village.name,
    page: Number(query.page || 1),
    excludeEmergency: true,
  });
  const pathname = `/villages/${village.slug}`;
  const canonicalUrl = `${siteConfig.url}${pathname}`;
  const listId = `${canonicalUrl}#item-list`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        name: `دليل ${village.name}`,
        description: village.description,
        url: canonicalUrl,
        inLanguage: 'ar-EG',
        mainEntity: { '@id': listId },
      },
      {
        '@type': 'Place',
        '@id': `${canonicalUrl}#place`,
        name: village.name,
        containedInPlace: { '@type': 'AdministrativeArea', name: 'مركز العسيرات، سوهاج، مصر' },
        url: canonicalUrl,
      },
      {
        '@type': 'ItemList',
        '@id': listId,
        name: `دليل ${village.name}`,
        numberOfItems: result.total,
        itemListElement: result.items.map((item, index) => ({
          '@type': 'ListItem',
          position: (result.page - 1) * result.pageSize + index + 1,
          url: `${siteConfig.url}/listing/${encodeURIComponent(item.slug)}`,
          name: item.title,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'قرى العسيرات', item: `${siteConfig.url}/villages` },
          { '@type': 'ListItem', position: 3, name: village.name, item: canonicalUrl },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className="page-main interior-redesign">
      <section className="village-hero village-hero--premium">
        <div className="shell village-hero__premium-grid">
          <div className="village-hero__content">
            <nav className="breadcrumbs" aria-label="مسار التنقل"><Link href="/villages">القرى</Link><span>/</span><span>{village.name}</span></nav>
            <div className="village-hero__identity">
              <span className="village-hero__brand" aria-hidden="true"><BrandMark /></span>
              <div>
                <span className="eyebrow">قرية ضمن نطاق العسيرات</span>
                <span className="village-hero__scope">مركز العسيرات · سوهاج</span>
              </div>
            </div>
            <h1>{village.name}</h1>
            <p>{village.description}</p>
            <div className="catalog-hero__actions">
              <Link href="#village-listings" className="button button--light">عرض الأنشطة</Link>
              <Link href="/villages" className="button button--outline-light">كل القرى</Link>
            </div>
          </div>

          <aside className="village-hero__summary" aria-label={`ملخص ${village.name}`}>
            <span className="catalog-hero__summary-label">ملخص القرية</span>
            <div className="catalog-hero__metrics">
              <span><b>{result.total.toLocaleString('ar-EG')}</b><small>سجل منشور</small></span>
              <span><b>{village.localities.length.toLocaleString('ar-EG')}</b><small>تابع/نجع</small></span>
              <span><b>{categorySummary.length.toLocaleString('ar-EG')}</b><small>أقسام متاحة</small></span>
            </div>
          </aside>
        </div>
      </section>

      <section className="shell page-section village-detail-content">
        {village.localities.length > 0 && (
          <div className="localities-panel localities-panel--premium">
            <div className="localities-panel__heading">
              <span className="localities-panel__mark" aria-hidden="true"><BrandMark compact /></span>
              <div><span>نطاقات محلية</span><h2>التوابع والنجوع المسجلة بالاسم</h2></div>
            </div>
            <div>{village.localities.map((locality) => <span key={locality}>{locality}</span>)}</div>
          </div>
        )}

        {categorySummary.length > 0 && (
          <section className="village-category-section village-category-section--premium" aria-labelledby="village-services-title">
            <div className="village-category-heading">
              <div>
                <span className="eyebrow eyebrow--dark">الخدمات داخل القرية</span>
                <h2 id="village-services-title">استكشف {village.name} حسب القسم</h2>
              </div>
              <span>{categorySummary.length.toLocaleString('ar-EG')} أقسام متاحة</span>
            </div>
            <div className="village-category-grid">
              {categorySummary.map(({ category, count }) => (
                <Link
                  key={category.id}
                  className="village-category-link"
                  href={`/directory/${category.id}?village=${encodeURIComponent(village.name)}`}
                >
                  <CategoryVisual category={category.id} size="sm" />
                  <span className="village-category-link__copy"><span>{category.shortLabel}</span><small>عرض النتائج ←</small></span>
                  <strong>{count.toLocaleString('ar-EG')}</strong>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div id="village-listings" className="section-heading section-heading--compact interior-section-heading">
          <div><span className="eyebrow eyebrow--dark">كل الأنشطة</span><h2>البيانات المنشورة في {village.name}</h2></div>
          {result.total > result.pageSize ? <p>عرض {result.from.toLocaleString('ar-EG')}–{result.to.toLocaleString('ar-EG')} من {result.total.toLocaleString('ar-EG')}</p> : <span className="interior-section-heading__count">{result.total.toLocaleString('ar-EG')} نتيجة</span>}
        </div>
        {result.items.length ? (
          <>
            <div className="listing-grid">{result.items.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
            {result.totalPages > 1 && (
              <nav className="detail-actions detail-actions--pagination" aria-label={`صفحات دليل ${village.name}`}>
                {result.page > 1 && <Link className="button button--ghost" rel="prev" href={createDirectoryHref(pathname, { page: result.page - 1 })}>السابق</Link>}
                <span>صفحة {result.page.toLocaleString('ar-EG')} من {result.totalPages.toLocaleString('ar-EG')}</span>
                {result.page < result.totalPages && <Link className="button button--primary" rel="next" href={createDirectoryHref(pathname, { page: result.page + 1 })}>التالي</Link>}
              </nav>
            )}
          </>
        ) : (
          <div className="empty-state"><strong>لم تُنشر بيانات مؤكدة لهذه القرية بعد</strong><p>القرية موجودة في هيكل الموسوعة وسيتم ربط الأنشطة بها عند اكتمال المراجعة.</p></div>
        )}
      </section>
      {!paginated && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />}
    </main>
  );
}
