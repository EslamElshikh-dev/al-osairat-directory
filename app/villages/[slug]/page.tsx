import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getListingsByVillage, villageBySlug, villages } from '@/lib/data';
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

export default async function VillagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const village = villageBySlug[normalizeRouteSlug(slug)];
  if (!village) notFound();

  const [publishedListings] = await Promise.all([
    getPublishedListings({ village: village.name }),
  ]);
  const villageListings = [...getListingsByVillage(village.name), ...publishedListings];

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
        numberOfItems: villageListings.length,
        itemListElement: villageListings.slice(0, 50).map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
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
          <div className="village-hero__stats"><span><b>{villageListings.length}</b> سجل منشور</span><span><b>{village.localities.length}</b> تابع/نجع مسمى</span></div>
        </div>
      </section>

      <section className="shell page-section">
        {village.localities.length > 0 && (
          <div className="localities-panel">
            <h2>التوابع والنجوع المسجلة بالاسم</h2>
            <div>{village.localities.map((locality) => <span key={locality}>{locality}</span>)}</div>
          </div>
        )}
        <div className="section-heading section-heading--compact"><div><span className="eyebrow eyebrow--dark">الخدمات</span><h2>البيانات المنشورة في {village.name}</h2></div></div>
        {villageListings.length ? (
          <div className="listing-grid">{villageListings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div>
        ) : (
          <div className="empty-state"><strong>لم تُنشر بيانات مؤكدة لهذه القرية بعد</strong><p>القرية موجودة في هيكل الموسوعة وسيتم ربط الأنشطة بها عند اكتمال المراجعة.</p></div>
        )}
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
