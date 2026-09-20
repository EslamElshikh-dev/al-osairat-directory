import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { categoryById, listings, type DirectoryListing } from '@/lib/data';
import { buildPageMetadata } from '@/lib/metadata';
import { getPublicDirectoryListings } from '@/lib/public-directory';
import { isVillageCategoryLandingEligible, villageCategoryLandingPath, villageForListing } from '@/lib/programmatic-seo';
import { isFallbackScope, isListingIndexable, villagePathByName } from '@/lib/seo-growth';
import { googleMapsHref, normalizeRouteSlug, phoneHref, siteConfig, sourceDescription, sourceLabel, verificationStatusLabel, whatsappHref } from '@/lib/site';
import { ListingCard } from '@/components/listing-card';
import { FavoriteButton } from '@/components/favorite-button';
import { ListingReport } from '@/components/listing-report';
import { CategoryVisual } from '@/components/category-visual';
import { BrandMark } from '@/components/site-shell';
import { imageForListing } from '@/lib/directory-images';
import { villageCategoryDirectoryHref } from '@/lib/discovery';
import { latestScanImageForListing } from '@/lib/latest-scan-images';
import { MemberReviews } from '@/components/member-reviews';
import { SandContextLink } from '@/components/sand-context-link';
import { formatLivingDate, getLivingRelatedListings, listingFreshness, listingTrust } from '@/lib/living-directory';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return listings.filter((listing) => listing.category !== 'emergency').map((listing) => ({ slug: listing.slug }));
}

async function resolveListing(rawSlug: string) {
  const slug = normalizeRouteSlug(rawSlug);
  const allListings = await getPublicDirectoryListings();
  return {
    listing: allListings.find((item) => item.slug === slug) || null,
    allListings,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { listing } = await resolveListing(slug);
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
  const image = latestScanImageForListing(listing) || imageForListing(listing);

  return buildPageMetadata({
    title,
    description,
    path: `/listing/${listing.slug}`,
    noIndex: !isListingIndexable(listing),
    imageAlt: `${listing.title} في دليل العسيرات`,
    imageUrl: image.src,
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
  const { listing, allListings } = await resolveListing(slug);
  if (!listing) notFound();
  const category = categoryById[listing.category];
  const phone = phoneHref(listing.phone);
  const whatsapp = whatsappHref(listing);
  const maps = googleMapsHref(listing);
  const lastUpdated = formatListingDate(listing.lastUpdatedAt);
  const dataSourceLabel = sourceLabel(listing);
  const verificationLabel = verificationStatusLabel(listing);
  const fallbackScope = isFallbackScope(listing.village);
  const villagePath = villagePathByName(listing.village);
  const scopeLabel = fallbackScope ? 'مركز العسيرات' : `${listing.village} · مركز العسيرات`;
  const coverImage = latestScanImageForListing(listing) || imageForListing(listing);
  const freshness = listingFreshness(listing);
  const trust = listingTrust(listing);
  const livingUpdatedLabel = formatLivingDate(listing.lastUpdatedAt);

  const comparableListings = allListings;
  const nearby = getLivingRelatedListings(listing, comparableListings, 4);
  const listingVillage = villageForListing(listing);
  const localLandingPath = listingVillage
    && isVillageCategoryLandingEligible(comparableListings, listing.village, listing.category)
    ? villageCategoryLandingPath(listingVillage, listing.category)
    : '';

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
            <div className="detail-hero__media">
              <Image src={coverImage.src} alt={coverImage.alt} fill priority sizes="(max-width: 760px) 100vw, 390px" />
              <span className="directory-media__shade" aria-hidden="true" />
              <span className="directory-media__label">{coverImage.label}</span>
              {(listing.googlePlaceId || listing.googleMapsUrl) && (
                <a className="detail-hero__media-source" href={maps} target="_blank" rel="noreferrer">
                  صور ومعلومات المكان على خرائط Google
                </a>
              )}
            </div>
            <span className="catalog-hero__summary-label">بيانات موثقة داخل الدليل</span>
            <div className="detail-hero__summary-brand"><span aria-hidden="true"><BrandMark compact /></span><strong>{dataSourceLabel}</strong></div>
            <div className="detail-hero__summary-list">
              <span><small>القسم</small><b>{category.shortLabel}</b></span>
              <span><small>النطاق</small><b>{listing.village}</b></span>
              <span><small>حالة التحقق</small><b>{verificationLabel}</b></span>
              {lastUpdated && <span><small>آخر تحديث</small><b>{lastUpdated}</b></span>}
            </div>
          </aside>
        </div>
      </section>

      <section className="shell living-status-strip" aria-label="حالة النشاط داخل الدليل">
        <article className={`living-status-card is-${trust.key}`}>
          <span className="living-status-card__icon" aria-hidden="true">✓</span>
          <div><small>الثقة في المصدر</small><strong>{trust.label}</strong><p>{trust.detail}</p></div>
        </article>
        <article className={`living-status-card is-${freshness.key}`}>
          <span className="living-status-card__icon" aria-hidden="true">↻</span>
          <div><small>حداثة البيانات</small><strong>{freshness.label}</strong><p>{freshness.days !== null ? `منذ ${freshness.days.toLocaleString('ar-EG')} يومًا` : freshness.detail}</p></div>
        </article>
        {typeof listing.rating === 'number' && listing.reviewCount > 0 ? (
          <article className="living-status-card is-rating">
            <span className="living-status-card__icon" aria-hidden="true">★</span>
            <div><small>تقييم المصدر الخارجي</small><strong>{listing.rating.toFixed(1)} / 5</strong><p>{listing.reviewCount.toLocaleString('ar-EG')} مراجعة بحسب المصدر المرتبط بالسجل</p></div>
          </article>
        ) : (
          <article className="living-status-card is-community">
            <span className="living-status-card__icon" aria-hidden="true">✦</span>
            <div><small>تجربة المجتمع</small><strong>مفتوح لآراء الأعضاء</strong><p>تقييمات أعضاء الدليل تظهر بشكل مستقل عن تقييمات المصادر الخارجية.</p></div>
          </article>
        )}
        {villagePath ? (
          <Link href={villagePath} className="living-status-card living-status-card--link">
            <span className="living-status-card__icon" aria-hidden="true">⌖</span>
            <div><small>المكان</small><strong>{listing.village}</strong><p>استكشف القرية وكل الخدمات المنشورة فيها ←</p></div>
          </Link>
        ) : null}
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
            <p><b>حالة التحقق:</b> {verificationLabel}</p>
            {lastUpdated && <p><b>آخر تحديث موثق داخل الدليل:</b> {lastUpdated}</p>}
            <p>{sourceDescription(listing)}</p>
            <div className="detail-actions detail-actions--management">
              <Link className="button button--primary" href={`/account?claim=${encodeURIComponent(listing.id)}#ownership-claims`}>امتلك هذا النشاط</Link>
              <Link className="button button--soft" href="/account#my-businesses">تعديل نشاط تملكه</Link>
              <Link className="button button--ghost" href="/account#business-submissions">أضف نشاطك</Link>
            </div>
            <ListingReport listingId={listing.id} listingTitle={listing.title} />
          </div>

          <section className="living-timeline" aria-labelledby="living-timeline-title">
            <div className="living-timeline__heading">
              <span>نبض السجل</span>
              <h2 id="living-timeline-title">رحلة البيانات والمجتمع</h2>
              <p>خط زمني مختصر لما نعرفه عن السجل بدون اختراع أحداث أو تواريخ غير متاحة.</p>
            </div>
            <ol>
              <li className="is-source">
                <span aria-hidden="true">01</span>
                <div><small>المصدر الحالي</small><strong>{trust.label}</strong><p>{trust.detail}</p></div>
              </li>
              {livingUpdatedLabel ? (
                <li className="is-update">
                  <span aria-hidden="true">02</span>
                  <div><small>آخر مراجعة موثقة</small><strong>{livingUpdatedLabel}</strong><p>{freshness.detail}</p></div>
                </li>
              ) : null}
              {(listing.googlePlaceId || listing.googleMapsUrl) ? (
                <li className="is-map">
                  <span aria-hidden="true">03</span>
                  <div><small>مرجع المكان</small><strong>موقع مرتبط بخرائط Google</strong><p>يمكن فتح المرجع الخارجي للتحقق من المكان والمعلومات المتاحة هناك.</p></div>
                </li>
              ) : null}
              <li className="is-community">
                <span aria-hidden="true">✦</span>
                <div><small>المرحلة الحية</small><strong>آراء وردود أعضاء الدليل</strong><p><a href="#listing-community-reviews">انتقل لتجارب المجتمع وردود الأعضاء ↓</a></p></div>
              </li>
            </ol>
          </section>
        </article>

        <aside className="detail-aside detail-aside--premium">
          <div className="detail-aside__heading">
            <span className="eyebrow eyebrow--dark">اكتشاف ذكي</span>
            <h2>أنشطة مشابهة ومفيدة</h2>
            <p>{fallbackScope ? 'نرتب البدائل بحسب القسم والتشابه وجودة البيانات داخل مركز العسيرات.' : `نبدأ بالأقرب إلى ${listing.village} والتخصص نفسه، ثم نوسّع الاختيارات عند الحاجة بدل ترك المسار بلا بدائل.`}</p>
          </div>
          <div className="detail-aside__list">
            {nearby.length ? nearby.map((match) => (
              <div className="living-related-card" key={match.listing.id}>
                <div className="living-related-card__reasons" aria-label="سبب اقتراح النشاط">
                  {match.reasons.map((reason) => <span key={reason}>{reason}</span>)}
                </div>
                <ListingCard listing={match.listing} compact />
              </div>
            )) : <p className="detail-aside__empty">لا توجد سجلات مشابهة منشورة حاليًا.</p>}
          </div>

          <div className="detail-aside__discovery-actions">
            {villagePath && (
              <Link className="button button--soft" href={villagePath}>
                استكشف كل أنشطة {listing.village}
              </Link>
            )}
            <Link
              className="button button--ghost"
              href={localLandingPath || villageCategoryDirectoryHref(listing.village, listing.category)}
            >
              كل {category.shortLabel} في {listing.village}
            </Link>
            <Link className="button button--ghost" href={`/directory/${listing.category}`}>
              كل {category.shortLabel} في العسيرات
            </Link>
          </div>
        </aside>
      </section>

      <section className="shell living-journey" aria-labelledby="living-journey-title">
        <div className="living-journey__intro">
          <span className="eyebrow eyebrow--dark">رحلة محلية واحدة</span>
          <h2 id="living-journey-title">من المكان للمعلومة… ومن المعلومة للناس</h2>
          <p>بدل ما تنتهي الزيارة عند بطاقة النشاط، كمّل للقرية أو المجتمع أو اطلب من سَند يجيب لك بدائل بنفس السياق.</p>
        </div>
        <nav className="living-journey__rail" aria-label="رحلة الاستكشاف داخل دليل العسيرات">
          {villagePath ? <Link href={villagePath}><span>01</span><small>المكان</small><strong>{listing.village}</strong></Link> : null}
          <a className="is-current" href="#main-content"><span>02</span><small>أنت هنا</small><strong>{listing.title}</strong></a>
          <Link href="/community"><span>03</span><small>الناس</small><strong>نبض المجتمع</strong></Link>
          <SandContextLink
            className="living-journey__sand"
            prompt={`هات لي بدائل مشابهة لـ ${listing.title} في ${listing.village} وابدأ بالأقرب والأحدث مراجعة`}
          >
            <span>04</span><small>مساعد محلي</small><strong>اسأل سَند</strong>
          </SandContextLink>
        </nav>
      </section>

      <section id="listing-community-reviews" className="shell living-reviews-section">
        <MemberReviews
          targetType="listing"
          targetKey={listing.slug}
          eyebrow="تجارب أعضاء المجتمع"
          title={`آراء المجتمع حول ${listing.title}`}
          description="تقييمات أعضاء دليل العسيرات منفصلة عن تقييمات خرائط Google أو أي مصدر خارجي، ويمكن للأعضاء الرد والنقاش داخل كل تجربة."
          prompt={`كيف كانت تجربتك مع ${listing.title}؟`}
          className="member-reviews--listing"
        />
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
