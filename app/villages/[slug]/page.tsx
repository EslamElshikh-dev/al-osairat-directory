import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categories, villageBySlug, villages } from '@/lib/data';
import { createDirectoryHref, queryDirectoryListings } from '@/lib/directory-query';
import { buildPageMetadata } from '@/lib/metadata';
import { getPublicDirectoryListings } from '@/lib/public-directory';
import { ListingCard } from '@/components/listing-card';
import { CategoryVisual } from '@/components/category-visual';
import { BrandMark } from '@/components/site-shell';
import { isVillageCategoryLandingEligible, isVillageHubIndexable, villageCategoryLandingPath } from '@/lib/programmatic-seo';
import { isFallbackScope, isFilteredDirectoryState } from '@/lib/seo-growth';
import { normalizeRouteSlug, siteConfig } from '@/lib/site';
import { getLowCoverageCategories, getUndercoveredVillages, villageCategoryDirectoryHref } from '@/lib/discovery';

type VillageSearchParams = { page?: string };

async function loadVillageCatalog(_villageName: string) {
  return getPublicDirectoryListings();
}

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

  const allListings = await loadVillageCatalog(village.name);
  const page = Math.max(1, Number(query.page || 1) || 1);
  const fallbackScope = isFallbackScope(village.name);
  const hubIndexable = isVillageHubIndexable(allListings, village.name);
  if (page > 1) {
    const paginationResult = queryDirectoryListings(allListings, {
      village: village.name,
      page,
      excludeEmergency: true,
    });
    if (page > paginationResult.totalPages) notFound();
  }
  const purePagination = !fallbackScope && page > 1;
  const baseTitle = fallbackScope
    ? 'سجلات غير محددة القرية داخل مركز العسيرات'
    : `دليل ${village.name}: الخدمات والأنشطة والنجوع`;
  const baseDescription = fallbackScope
    ? village.description
    : `دليل ${village.name} في مركز العسيرات: الخدمات والأنشطة المحلية، وأسماء النجوع والتوابع ومنها ${village.localities.slice(0, 5).join('، ')}.`;
  const title = purePagination
    ? `${baseTitle} - الصفحة ${page.toLocaleString('ar-EG')}`
    : baseTitle;
  const description = purePagination
    ? `${baseDescription} الصفحة ${page.toLocaleString('ar-EG')} من النتائج المحلية.`
    : baseDescription;
  const pathname = `/villages/${village.slug}`;

  return buildPageMetadata({
    title,
    description,
    path: pathname,
    noIndex: fallbackScope || !hubIndexable || page > 1,
    imageAlt: fallbackScope ? 'سجلات النطاق العام في مركز العسيرات' : `دليل ${village.name} في العسيرات`,
  });
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

  const fallbackScope = isFallbackScope(village.name);

  const allListings = await loadVillageCatalog(village.name);
  const villageListings = allListings.filter((item) => item.village === village.name && item.category !== 'emergency');
  const categorySummary = categories
    .map((category) => ({
      category,
      count: villageListings.filter((item) => item.category === category.id).length,
      qualified: !fallbackScope && isVillageCategoryLandingEligible(allListings, village.name, category.id),
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => Number(b.qualified) - Number(a.qualified) || b.count - a.count);

  const lowCoverageCategories = fallbackScope ? [] : getLowCoverageCategories(allListings, village.name, 4);
  const undercoveredVillages = fallbackScope
    ? []
    : getUndercoveredVillages(allListings, 6)
        .filter((item) => item.village.name !== village.name)
        .slice(0, 3);

  const result = queryDirectoryListings(allListings, {
    village: village.name,
    page: Number(query.page || 1),
    excludeEmergency: true,
  });
  const requestedPage = Math.max(1, Number(query.page || 1) || 1);
  if (requestedPage > result.totalPages) notFound();
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
        description: village.description,
        containedInPlace: { '@type': 'AdministrativeArea', name: 'مركز العسيرات، سوهاج، مصر' },
        containsPlace: village.localities.map((locality) => ({ '@type': 'Place', name: locality })),
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
    <main id="main-content" className="page-main interior-redesign village-discovery-v4">
      <section className="village-hero village-hero--premium village-hero--search-first">
        <div className="shell village-hero__premium-grid">
          <div className="village-hero__content">
            <nav className="breadcrumbs" aria-label="مسار التنقل"><Link href="/villages">القرى</Link><span>/</span><span>{village.name}</span></nav>
            <div className="village-hero__identity">
              <span className="village-hero__brand" aria-hidden="true"><BrandMark /></span>
              <div>
                <span className="eyebrow">{fallbackScope ? 'نطاق تجميعي داخلي' : 'قرية ضمن نطاق العسيرات'}</span>
                <span className="village-hero__scope">مركز العسيرات · سوهاج</span>
              </div>
            </div>
            <h1>{fallbackScope ? 'سجلات غير محددة القرية' : `دليل ${village.name}`}</h1>
            <p>{village.description}</p>

            {!fallbackScope && (
              <form className="village-hero-search" action="/directory" method="get" role="search">
                <input type="hidden" name="village" value={village.name} />
                <label className="sr-only" htmlFor={`village-search-${village.slug}`}>ابحث داخل {village.name}</label>
                <div className="village-hero-search__field">
                  <span aria-hidden="true"><BrandMark compact /></span>
                  <input
                    id={`village-search-${village.slug}`}
                    name="q"
                    placeholder={`ابحث داخل ${village.name}: صيدلية، دكتور، مدرسة...`}
                    inputMode="search"
                    autoComplete="off"
                  />
                  <button type="submit" className="button button--light">ابحث هنا</button>
                </div>
              </form>
            )}

            {!fallbackScope && categorySummary.length > 0 && (
              <nav className="village-hero-categories" aria-label={`أهم أقسام ${village.name}`}>
                <span>الأكثر توفرًا:</span>
                {categorySummary.slice(0, 5).map(({ category, qualified }) => (
                  <Link
                    key={category.id}
                    href={qualified
                      ? villageCategoryLandingPath(village, category)
                      : `/directory/${category.id}?village=${encodeURIComponent(village.name)}`}
                  >
                    {category.shortLabel}
                  </Link>
                ))}
              </nav>
            )}

            <div className="catalog-hero__actions">
              <Link href="#village-listings" className="button button--light">عرض الأنشطة</Link>
              <Link href="/villages" className="button button--outline-light">كل القرى</Link>
            </div>
          </div>

          <aside className="village-hero__summary" aria-label={fallbackScope ? 'ملخص النطاق التجميعي' : `ملخص ${village.name}`}>
            <span className="catalog-hero__summary-label">{fallbackScope ? 'ملخص النطاق' : 'ملخص القرية'}</span>
            <div className="catalog-hero__metrics">
              <span><b>{result.total.toLocaleString('ar-EG')}</b><small>سجل منشور</small></span>
              {!fallbackScope && <span><b>{village.localities.length.toLocaleString('ar-EG')}</b><small>تابعًا ونجعًا</small></span>}
              <span><b>{categorySummary.length.toLocaleString('ar-EG')}</b><small>أقسام متاحة</small></span>
            </div>
            {!fallbackScope && (
              <Link href={`/directory?village=${encodeURIComponent(village.name)}`} className="catalog-hero__summary-cta">افتح نتائج القرية فقط ←</Link>
            )}
          </aside>
        </div>
      </section>

      <section className="shell page-section village-detail-content">
        {village.localities.length > 0 && (
          <div id="localities" className="localities-panel localities-panel--premium localities-panel--discovery">
            <div className="localities-panel__heading">
              <span className="localities-panel__mark" aria-hidden="true"><BrandMark compact /></span>
              <div><span>نطاقات محلية</span><h2>التوابع والنجوع المسجلة بالاسم</h2></div>
            </div>
            <div>
              {village.localities.map((locality) => (
                <Link
                  key={locality}
                  href={`/directory?village=${encodeURIComponent(village.name)}&q=${encodeURIComponent(locality)}`}
                >
                  {locality}<b aria-hidden="true">←</b>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!fallbackScope && lowCoverageCategories.length > 0 && (
          <section className="village-balance-panel" aria-labelledby="village-balance-title">
            <div className="village-balance-panel__copy">
              <span className="eyebrow eyebrow--dark">اكتشاف متوازن</span>
              <h2 id="village-balance-title">أقسام موجودة وتستحق استكشافًا أكبر</h2>
              <p>بدل عرض الأقسام الأكثر كثافة فقط، نبرز هنا الخدمات ذات الحضور الأقل داخل {village.name} حتى يكون الوصول للمحتوى المحلي أكثر توازنًا.</p>
            </div>
            <nav className="village-balance-panel__links" aria-label={`أقسام أقل تغطية في ${village.name}`}>
              {lowCoverageCategories.map(({ category, count }) => (
                <Link key={category.id} href={villageCategoryDirectoryHref(village.name, category.id)}>
                  <CategoryVisual category={category.id} size="sm" />
                  <span>{category.shortLabel}</span>
                  <small>{count.toLocaleString('ar-EG')} سجل</small>
                </Link>
              ))}
            </nav>
          </section>
        )}

        {categorySummary.length > 0 && (
          <section className="village-category-section village-category-section--premium village-category-section--discovery" aria-labelledby="village-services-title">
            <div className="village-category-heading">
              <div>
                <span className="eyebrow eyebrow--dark">{fallbackScope ? 'السجلات حسب القسم' : 'الخدمات داخل القرية'}</span>
                <h2 id="village-services-title">{fallbackScope ? 'استكشف السجلات غير محددة القرية' : `استكشف ${village.name} حسب القسم`}</h2>
              </div>
              <span>{categorySummary.length.toLocaleString('ar-EG')} أقسام متاحة</span>
            </div>
            <div className="village-category-grid">
              {categorySummary.map(({ category, count, qualified }) => (
                <Link
                  key={category.id}
                  className="village-category-link"
                  href={qualified
                    ? villageCategoryLandingPath(village, category)
                    : `/directory/${category.id}?village=${encodeURIComponent(village.name)}`}
                >
                  <CategoryVisual category={category.id} size="sm" />
                  <span className="village-category-link__copy">
                    <span>{qualified ? `${category.shortLabel} في ${village.name}` : category.shortLabel}</span>
                    <small>{qualified ? 'صفحة محلية متخصصة ←' : 'عرض النتائج ←'}</small>
                  </span>
                  <strong>{count.toLocaleString('ar-EG')}</strong>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div id="village-listings" className="section-heading section-heading--compact interior-section-heading">
          <div>
            <span className="eyebrow eyebrow--dark">كل الأنشطة</span>
            <h2>{fallbackScope ? 'بيانات تحتاج إلى تحديد القرية بدقة' : `البيانات المنشورة في ${village.name}`}</h2>
          </div>
          {result.total > result.pageSize ? <p>عرض {result.from.toLocaleString('ar-EG')}–{result.to.toLocaleString('ar-EG')} من {result.total.toLocaleString('ar-EG')}</p> : <span className="interior-section-heading__count">{result.total.toLocaleString('ar-EG')} نتيجة</span>}
        </div>
        {result.items.length ? (
          <>
            <div className="listing-grid listing-grid--discovery">{result.items.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
            {result.totalPages > 1 && (
              <nav className="detail-actions detail-actions--pagination" aria-label={fallbackScope ? 'صفحات السجلات غير محددة القرية' : `صفحات دليل ${village.name}`}>
                {result.page > 1 && <Link className="button button--ghost" rel="prev" href={createDirectoryHref(pathname, { page: result.page - 1 })}>السابق</Link>}
                <span>صفحة {result.page.toLocaleString('ar-EG')} من {result.totalPages.toLocaleString('ar-EG')}</span>
                {result.page < result.totalPages && <Link className="button button--primary" rel="next" href={createDirectoryHref(pathname, { page: result.page + 1 })}>التالي</Link>}
              </nav>
            )}
          </>
        ) : (
          <div className="empty-state">
            <strong>{fallbackScope ? 'لا توجد سجلات غير محددة القرية حاليًا' : 'لم تُنشر بيانات مؤكدة لهذه القرية بعد'}</strong>
            <p>{fallbackScope ? 'عندما تُحدَّد القرية الفعلية لسجل، يُنقل إلى نطاقه الصحيح داخل الدليل.' : 'القرية موجودة في هيكل الموسوعة، وستُربط الأنشطة بها عند اكتمال المراجعة.'}</p>
          </div>
        )}
        {!fallbackScope && undercoveredVillages.length > 0 && (
          <section className="village-neighbor-discovery" aria-labelledby="village-neighbor-discovery-title">
            <div>
              <span className="eyebrow eyebrow--dark">استكشف قرى أخرى</span>
              <h2 id="village-neighbor-discovery-title">قرى نوسّع حضورها داخل الدليل</h2>
              <p>روابط مباشرة لقرى لديها محتوى منشور لكن تغطيتها الحالية أقل من غيرها، حتى لا تتركز الحركة في الصفحات الأقوى فقط.</p>
            </div>
            <nav>
              {undercoveredVillages.map(({ village: candidate, listingCount, categoryCount }) => (
                <Link key={candidate.slug} href={`/villages/${candidate.slug}`}>
                  <strong>{candidate.name}</strong>
                  <span>{listingCount.toLocaleString('ar-EG')} سجل · {categoryCount.toLocaleString('ar-EG')} أقسام</span>
                  <b aria-hidden="true">←</b>
                </Link>
              ))}
            </nav>
          </section>
        )}
      </section>
      {!paginated && !fallbackScope && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />}
    </main>
  );
}
