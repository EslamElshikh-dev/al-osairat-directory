import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categoryById, listingBySlug, listings, type DirectoryListing } from '@/lib/data';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { buildPageMetadata } from '@/lib/metadata';
import { getPublishedListingBySlug, getPublishedListings } from '@/lib/published-listings';
import { isFallbackScope, isListingIndexable, villagePathByName } from '@/lib/seo-growth';
import { googleMapsHref, normalizeRouteSlug, phoneHref, siteConfig, sourceDescription, sourceLabel, whatsappHref } from '@/lib/site';
import { ListingCard } from '@/components/listing-card';
import { FavoriteButton } from '@/components/favorite-button';
import { ListingReport } from '@/components/listing-report';
import { CategoryVisual } from '@/components/category-visual';
import { BrandMark } from '@/components/site-shell';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return listings.filter((listing) => listing.category !== 'emergency').map((listing) => ({ slug: listing.slug }));
}

async function resolveListing(rawSlug: string) {
  const slug = normalizeRouteSlug(rawSlug);
  const staticListing = listingBySlug[slug];
  if (staticListing) {
    const [overridden] = await applyListingOverrides([staticListing]);
    return overridden || staticListing;
  }
  return getPublishedListingBySlug(slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const listing = await resolveListing(slug);
  if (!listing) return {};
  const category = categoryById[listing.category];
  const title = listing.title.includes(listing.village)
    ? listing.title
    : `${listing.title} - ${listing.village}`;
  const service = (listing.subCategory || category.shortLabel).length <= 52
    ? (listing.subCategory || category.shortLabel)
    : category.shortLabel;
  const location = listing.location.length <= 48 ? listing.location : listing.village;
  const description = `${listing.title}، ${service} في ${location}. بيانات التواصل والموقع ضمن دليل العسيرات.`;

  return buildPageMetadata({
    title,
    description,
    path: `/listing/${listing.slug}`,
    noIndex: !isListingIndexable(listing),
    imageAlt: `${listing.title} في دليل العسيرات`,
  });
}

function schemaTypeFor(listing: DirectoryListing) {
  if (/بنزين|وقود/.test(`${listing.title} ${listing.subCategory}`)) return 'GasStation';
  if (listing.category === 'doctors') {
    if (/معمل|مركز|مستشف|خدمات تمريض/.test(listing.title)) return 'MedicalBusiness';
    return 'Physician';
  }
  if (listing.category === 'pharmacies') return 'Pharmacy';
  if (listing.category === 'education') return 'School';
  if (listing.category === 'restaurants') return 'Restaurant';
  if (listing.category === 'lawyers') return 'LegalService';
  if (listing.category === 'government') return 'GovernmentOrganization';
  if (listing.category === 'community') return 'Place';
  if (listing.category === 'emergency') return 'GovernmentService';
  return 'LocalBusiness';
}

function formatListingDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await resolveListing(slug);
  if (!listing) notFound();
  const category = categoryById[listing.category];
  const phone = phoneHref(listing.phone);
  const whatsapp = whatsappHref(listing);
  const maps = googleMapsHref(listing);
  const lastUpdated = formatListingDate(listing.lastUpdatedAt);
  const dataSourceLabel = sourceLabel(listing);
  const fallbackScope = isFallbackScope(listing.village);
  const villagePath = villagePathByName(listing.village);
  const scopeLabel = fallbackScope ? 'مركز العسيرات' : `${listing.village} · مركز العسيرات`;

  const [publishedNearby, overriddenStatic] = await Promise.all([
    getPublishedListings({ category: listing.category, village: listing.village }),
    applyListingOverrides(listings),
  ]);
  const nearby = [...overriddenStatic, ...publishedNearby]
    .filter((item) => item.id !== listing.id && item.category === listing.category && item.village === listing.village)
    .slice(0, 3);

  const entity = {
    '@type': schemaTypeFor(listing),
    '@id': `${siteConfig.url}/listing/${listing.slug}#entity`,
    name: listing.title,
    description: listing.description || listing.subCategory || category.description,
    mainEntityOfPage: `${siteConfig.url}/listing/${listing.slug}`,
    ...(listing.phone && listing.phone !== '0' ? { telephone: listing.phone } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.location,
      addressLocality: fallbackScope ? 'العسيرات' : listing.village,
      addressRegion: 'سوهاج',
      addressCountry: 'EG',
    },
    areaServed: fallbackScope
      ? { '@type': 'AdministrativeArea', name: 'مركز العسيرات، سوهاج، مصر' }
      : {
          '@type': 'Place',
          name: listing.village,
          ...(villagePath ? { url: `${siteConfig.url}${villagePath}` } : {}),
          containedInPlace: { '@type': 'AdministrativeArea', name: 'مركز العسيرات، سوهاج، مصر' },
        },
    url: `${siteConfig.url}/listing/${listing.slug}`,
    ...(listing.lastUpdatedAt ? { dateModified: listing.lastUpdatedAt } : {}),
    ...((listing.googlePlaceId || listing.googleMapsUrl) ? { hasMap: maps } : {}),
  };

  const breadcrumbTrail = [
    { name: 'الرئيسية', url: siteConfig.url },
    { name: category.shortLabel, url: `${siteConfig.url}/directory/${listing.category}` },
    ...(villagePath ? [{ name: listing.village, url: `${siteConfig.url}${villagePath}` }] : []),
    { name: listing.title, url: `${siteConfig.url}/listing/${listing.slug}` },
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      entity,
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbTrail.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      },
    ],
  };

  return (
    <main id="main-content" className="page-main interior-redesign">
      <section className="detail-hero detail-hero--premium">
        <div className="shell detail-hero__premium-grid">
          <div className="detail-hero__content">
            <nav className="breadcrumbs" aria-label="مسار التنقل">
              <Link href="/">الرئيسية</Link><span>/</span>
              <Link href={`/directory/${listing.category}`}>{category.shortLabel}</Link><span>/</span>
              {villagePath && <><Link href={villagePath}>{listing.village}</Link><span>/</span></>}
              <span>{listing.title}</span>
            </nav>

            <div className="detail-hero__identity">
              <CategoryVisual category={listing.category} size="lg" />
              <div>
                <span className="eyebrow">{listing.subCategory || category.shortLabel}</span>
                <span className="detail-hero__scope">{scopeLabel}</span>
              </div>
            </div>

            <h1>{listing.title}</h1>
            <p>{listing.location}</p>
            <div className="detail-actions detail-actions--hero">
              <FavoriteButton listingId={listing.id} variant="hero" showLabel />
              {phone && <a className="button button--light" href={phone}>اتصال مباشر</a>}
              {whatsapp && <a className="button button--outline-light" href={whatsapp} target="_blank" rel="noreferrer">واتساب</a>}
              <a className="button button--outline-light" href={maps} target="_blank" rel="noreferrer">فتح في الخرائط</a>
            </div>
          </div>

          <aside className="detail-hero__summary" aria-label="ملخص بيانات النشاط">
            <span className="catalog-hero__summary-label">بيانات موثقة داخل الدليل</span>
            <div className="detail-hero__summary-brand"><span aria-hidden="true"><BrandMark compact /></span><strong>{dataSourceLabel}</strong></div>
            <div className="detail-hero__summary-list">
              <span><small>القسم</small><b>{category.shortLabel}</b></span>
              <span><small>النطاق</small><b>{listing.village}</b></span>
              {lastUpdated && <span><small>آخر تحديث</small><b>{lastUpdated}</b></span>}
            </div>
          </aside>
        </div>
      </section>

      <section className="shell detail-layout detail-layout--premium">
        <article className="detail-card detail-card--premium">
          <div className="detail-card__heading">
            <span className="detail-card__mark" aria-hidden="true"><BrandMark compact /></span>
            <div><span>بيانات النشاط</span><h2>المعلومات الأساسية</h2></div>
          </div>

          <div className="detail-grid">
            <div><span>القسم</span><strong>{category.label}</strong></div>
            <div><span>{fallbackScope ? 'النطاق' : 'القرية / النطاق'}</span><strong>{listing.village}</strong></div>
            {listing.phone && listing.phone !== '0' && <div><span>الهاتف</span><strong dir="ltr">{listing.phone}</strong></div>}
            {listing.hours && <div><span>مواعيد العمل</span><strong>{listing.hours}</strong></div>}
            {listing.deliveryAvailable && <div><span>التوصيل</span><strong>متاح بحسب المصدر</strong></div>}
            {listing.googleMapsPlusCode && <div><span>Plus Code</span><strong dir="ltr">{listing.googleMapsPlusCode}</strong></div>}
          </div>

          {listing.description && <div className="detail-description"><span className="detail-section-label">نبذة</span><h2>معلومات إضافية</h2><p>{listing.description}</p></div>}

          <div className="source-panel source-panel--premium">
            <div className="source-panel__heading">
              <span className="source-panel__icon" aria-hidden="true">✓</span>
              <div><span>حالة ومصدر البيانات</span><strong>{dataSourceLabel}</strong></div>
            </div>
            {lastUpdated && <p><b>آخر تحديث موثق داخل الدليل:</b> {lastUpdated}</p>}
            <p>{sourceDescription(listing)}</p>
            <div className="detail-actions detail-actions--management">
              <Link className="button button--primary" href={`/account?claim=${encodeURIComponent(listing.id)}#ownership-claims`}>امتلك هذا النشاط</Link>
              <Link className="button button--soft" href="/account#my-businesses">تعديل نشاط تملكه</Link>
              <Link className="button button--ghost" href="/account#business-submissions">أضف نشاطك</Link>
            </div>
            <ListingReport listingId={listing.id} listingTitle={listing.title} />
          </div>
        </article>

        <aside className="detail-aside detail-aside--premium">
          <div className="detail-aside__heading">
            <span className="eyebrow eyebrow--dark">في نفس النطاق</span>
            <h2>{fallbackScope ? 'خدمات قريبة ضمن مركز العسيرات' : `خدمات قريبة في ${listing.village}`}</h2>
            <p>{fallbackScope ? 'نتائج من نفس القسم ضمن النطاق العام لمركز العسيرات.' : 'نتائج من نفس القسم والقرية لمساعدتك على المقارنة والوصول بسرعة.'}</p>
          </div>
          <div className="detail-aside__list">
            {nearby.length ? nearby.map((item) => <ListingCard key={item.id} listing={item} compact />) : <p className="detail-aside__empty">لا توجد سجلات مشابهة منشورة حاليًا.</p>}
          </div>
          <nav className="seo-context-links" aria-label="روابط مرتبطة بالنشاط">
            {villagePath && <Link href={villagePath}>دليل {listing.village}</Link>}
            <Link href={`/directory/${listing.category}`}>كل {category.shortLabel} في العسيرات</Link>
            <Link href="/directory">استكشف الدليل الكامل</Link>
          </nav>
        </aside>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
