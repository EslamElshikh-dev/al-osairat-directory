import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categoryById, listingBySlug, listings } from '@/lib/data';
import { googleMapsHref, phoneHref, siteConfig, sourceLabel, whatsappHref } from '@/lib/site';
import { ListingCard } from '@/components/listing-card';

export function generateStaticParams() {
  return listings.filter((listing) => listing.category !== 'emergency').map((listing) => ({ slug: listing.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const listing = listingBySlug[slug];
  if (!listing) return {};
  const category = categoryById[listing.category];
  const title = `${listing.title} - ${listing.village}`;
  const description = `${listing.subCategory || category.shortLabel} في ${listing.location}. بيانات التواصل والموقع ضمن دليل العسيرات.`;
  return {
    title,
    description,
    alternates: { canonical: `/listing/${listing.slug}` },
    openGraph: { title, description, url: `${siteConfig.url}/listing/${listing.slug}` },
  };
}

function schemaTypeFor(listing: (typeof listings)[number]) {
  if (listing.category === 'doctors') {
    if (/معمل|مركز|مستشف|خدمات تمريض/.test(listing.title)) return 'MedicalBusiness';
    return 'Physician';
  }
  if (listing.category === 'pharmacies') return 'Pharmacy';
  if (listing.category === 'restaurants') return 'Restaurant';
  if (listing.category === 'lawyers') return 'LegalService';
  if (listing.category === 'government') return 'GovernmentOrganization';
  if (listing.category === 'emergency') return 'GovernmentService';
  return 'LocalBusiness';
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = listingBySlug[slug];
  if (!listing) notFound();
  const category = categoryById[listing.category];
  const phone = phoneHref(listing.phone);
  const whatsapp = whatsappHref(listing);
  const maps = googleMapsHref(listing);
  const nearby = listings
    .filter((item) => item.id !== listing.id && item.category === listing.category && item.village === listing.village)
    .slice(0, 3);

  const entity = {
    '@type': schemaTypeFor(listing),
    '@id': `${siteConfig.url}/listing/${listing.slug}#entity`,
    name: listing.title,
    description: listing.description || listing.subCategory || category.description,
    ...(listing.phone && listing.phone !== '0' ? { telephone: listing.phone } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.location,
      addressLocality: listing.village,
      addressRegion: 'سوهاج',
      addressCountry: 'EG',
    },
    url: `${siteConfig.url}/listing/${listing.slug}`,
    ...(listing.googlePlaceId ? { hasMap: maps } : {}),
  };

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      entity,
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: category.shortLabel, item: `${siteConfig.url}/directory/${listing.category}` },
          { '@type': 'ListItem', position: 3, name: listing.title, item: `${siteConfig.url}/listing/${listing.slug}` },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className="page-main">
      <section className="detail-hero">
        <div className="shell">
          <nav className="breadcrumbs" aria-label="مسار التنقل">
            <Link href="/">الرئيسية</Link><span>/</span>
            <Link href={`/directory/${listing.category}`}>{category.shortLabel}</Link><span>/</span>
            <span>{listing.title}</span>
          </nav>
          <span className="eyebrow">{listing.subCategory || category.shortLabel}</span>
          <h1>{listing.title}</h1>
          <p>{listing.location}</p>
          <div className="detail-actions">
            {phone && <a className="button button--light" href={phone}>اتصال مباشر</a>}
            {whatsapp && <a className="button button--outline-light" href={whatsapp} target="_blank" rel="noreferrer">واتساب</a>}
            <a className="button button--outline-light" href={maps} target="_blank" rel="noreferrer">فتح في الخرائط</a>
          </div>
        </div>
      </section>

      <section className="shell detail-layout">
        <article className="detail-card">
          <div className="detail-grid">
            <div><span>القسم</span><strong>{category.label}</strong></div>
            <div><span>القرية / النطاق</span><strong>{listing.village}</strong></div>
            {listing.phone && listing.phone !== '0' && <div><span>الهاتف</span><strong dir="ltr">{listing.phone}</strong></div>}
            {listing.hours && <div><span>مواعيد العمل</span><strong>{listing.hours}</strong></div>}
            {listing.deliveryAvailable && <div><span>التوصيل</span><strong>متاح بحسب المصدر</strong></div>}
            {listing.googleMapsPlusCode && <div><span>Plus Code</span><strong dir="ltr">{listing.googleMapsPlusCode}</strong></div>}
          </div>
          {listing.description && <div className="detail-description"><h2>معلومات إضافية</h2><p>{listing.description}</p></div>}
          <div className="source-panel">
            <span>مصدر السجل</span>
            <strong>{sourceLabel(listing)}</strong>
            <p>قد تتغير أرقام الاتصال أو ساعات العمل بمرور الوقت؛ يُفضّل التأكد مباشرة من مقدم الخدمة قبل الزيارة.</p>
          </div>
        </article>

        <aside className="detail-aside">
          <h2>خدمات قريبة في {listing.village}</h2>
          <div className="detail-aside__list">
            {nearby.length ? nearby.map((item) => <ListingCard key={item.id} listing={item} compact />) : <p>لا توجد سجلات مشابهة منشورة حاليًا.</p>}
          </div>
        </aside>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
