import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listings, villageBySlug, villages } from '@/lib/data';
import { createDirectoryHref, mergeDirectoryListings, queryDirectoryListings } from '@/lib/directory-query';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
import { ListingCard } from '@/components/listing-card';
import { normalizeRouteSlug, siteConfig } from '@/lib/site';

export function generateStaticParams() {
  return villages.map((village) => ({ slug: village.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const village = villageBySlug[normalizeRouteSlug(slug)];
  if (!village) return {};
  return {
    title: `دليل ${village.name} - مركز العسيرات`,
    description: `الخدمات والأنشطة والبيانات المحلية المنشورة في ${village.name} ضمن مركز العسيرات بمحافظة سوهاج.`,
    alternates: { canonical: `/villages/${village.slug}` },
    openGraph: { title: `دليل ${village.name} - مركز العسيرات`, description: village.description, url: `${siteConfig.url}/villages/${village.slug}` },
  };
}

export const dynamic = 'force-dynamic';

export default async function VillagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const village = villageBySlug[normalizeRouteSlug(slug)];
  if (!village) notFound();

  const [publishedListings, overriddenListings] = await Promise.all([
    getPublishedListings({ village: village.name }),
    applyListingOverrides(listings),
  ]);

  const allListings = mergeDirectoryListings(overriddenListings, publishedListings);
  const result = queryDirectoryListings(allListings, {
    village: village.name,
    page: Number(query.page || 1),
    excludeEmergency: true,
  });
  const pathname = `/villages/${village.slug}`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Place',
        name: village.name,
        containedInPlace: { '@type': 'AdministrativeArea', name: 'مركز العسيرات، سوهاج، مصر' },
        url: `${siteConfig.url}/villages/${village.slug}`,
      },
      {
        '@type': 'ItemList',
        name: `دليل ${village.name}`,
        numberOfItems: result.total,
        itemListElement: result.items.map((item, index) => ({
          '@type': 'ListItem',
          position: (result.page - 1) * result.pageSize + index + 1,
          url: `${siteConfig.url}/listing/${item.slug}`,
          name: item.title,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'قرى العسيرات', item: `${siteConfig.url}/villages` },
          { '@type': 'ListItem', position: 3, name: village.name, item: `${siteConfig.url}/villages/${village.slug}` },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className="page-main">
      <section className="village-hero">
        <div className="shell">
          <nav className="breadcrumbs" aria-label="مسار التنقل"><Link href="/villages">القرى</Link><span>/</span><span>{village.name}</span></nav>
          <span className="eyebrow">قرية ضمن نطاق العسيرات</span>
          <h1>{village.name}</h1>
          <p>{village.description}</p>
          <div className="village-hero__stats"><span><b>{result.total}</b> سجل منشور</span><span><b>{village.localities.length}</b> تابع/نجع مسمى</span></div>
        </div>
      </section>

      <section className="shell page-section">
        {village.localities.length > 0 && (
          <div className="localities-panel">
            <h2>التوابع والنجوع المسجلة بالاسم</h2>
            <div>{village.localities.map((locality) => <span key={locality}>{locality}</span>)}</div>
          </div>
        )}
        <div className="section-heading section-heading--compact">
          <div><span className="eyebrow eyebrow--dark">الخدمات</span><h2>البيانات المنشورة في {village.name}</h2></div>
          {result.total > result.pageSize && <p>عرض {result.from.toLocaleString('ar-EG')}–{result.to.toLocaleString('ar-EG')} من {result.total.toLocaleString('ar-EG')}</p>}
        </div>
        {result.items.length ? (
          <>
            <div className="listing-grid">{result.items.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
            {result.totalPages > 1 && (
              <nav className="detail-actions" aria-label={`صفحات دليل ${village.name}`}>
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
