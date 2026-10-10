import type { Metadata } from 'next';
import Link from 'next/link';
import { categories, getListingsByVillage, villages } from '@/lib/data';
import { BrandMark } from '@/components/brand-mark';
import { buildPageMetadata } from '@/lib/metadata';
import { isFallbackScope } from '@/lib/seo-growth';
import { siteConfig } from '@/lib/site';
import styles from './notebook.module.css';

export const metadata: Metadata = buildPageMetadata({
  title: 'قرى مركز العسيرات وتوابعها',
  description: 'استكشف القرى الأساسية والتوابع والخدمات المسجلة في نطاق مركز العسيرات بمحافظة سوهاج.',
  path: '/villages',
  imageAlt: 'قرى مركز العسيرات وتوابعها',
});

export default function VillagesPage() {
  const mainVillages = villages.filter((village) => !isFallbackScope(village.name));
  const totalListings = mainVillages.reduce((sum, village) => sum + getListingsByVillage(village.name).length, 0);
  const totalLocalities = mainVillages.reduce((sum, village) => sum + village.localities.length, 0);
  const pageUrl = `${siteConfig.url}/villages`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#page`,
        url: pageUrl,
        name: 'قرى مركز العسيرات وتوابعها',
        description: 'دليل القرى الأساسية والتوابع والخدمات المسجلة في نطاق مركز العسيرات بمحافظة سوهاج.',
        isPartOf: { '@id': `${siteConfig.url}#website` },
        mainEntity: { '@id': `${pageUrl}#villages` },
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#villages`,
        name: 'قرى مركز العسيرات',
        numberOfItems: mainVillages.length,
        itemListElement: mainVillages.map((village, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Place',
            name: village.name,
            description: village.description,
            url: `${siteConfig.url}/villages/${village.slug}`,
            containedInPlace: { '@type': 'AdministrativeArea', name: 'مركز العسيرات، سوهاج، مصر' },
          },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'قرى العسيرات', item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className={`page-main interior-redesign ${styles.page}`}>
      <section className="geo-hero">
        <div className="shell geo-hero__grid">
          <div className="geo-hero__copy">
            <span className="catalog-hero__kicker"><BrandMark compact /> الجغرافيا المحلية</span>
            <h1>قرى العسيرات…<br /><em>بلد واحدة تجمعنا.</em></h1>
            <p>كل قرية لها ناسها ونجوعها ومشاويرها. افتح دفتر قريتك، واكتشف الخدمات والأماكن المنشورة فيها.</p>
            <div className="catalog-hero__actions">
              <Link href="#villages-grid" className="button button--light">استكشف القرى</Link>
              <Link href="/directory" className="button button--outline-light">فتح الدليل الشامل</Link>
            </div>
          </div>

          <aside className={styles.heroBook} aria-label="ملخص القرى">
            <div className={styles.bookStamp}><BrandMark compact /><span>دفتر البلد<small>العسيرات · سوهاج</small></span></div>
            <strong className={styles.bookNumber}>{mainVillages.length.toLocaleString('ar-EG')}</strong>
            <p className={styles.bookTitle}>قرى. حكايات. مشاوير.</p>
            <span className={styles.bookNote}>أسماء نعرفها… وتفاصيل تقرّبنا.</span>
            <div className="catalog-hero__metrics">
              <span><b>{totalLocalities.toLocaleString('ar-EG')}</b><small>توابع مسماة</small></span>
              <span><b>{totalListings.toLocaleString('ar-EG')}</b><small>سجلًا مرتبطًا</small></span>
            </div>
            <div className={styles.bookHorizon} aria-hidden="true" />
          </aside>
        </div>
      </section>

      <section id="villages-grid" className="shell page-section villages-showcase">
        <nav className={styles.jumpNav} aria-label="انتقل إلى قرية">
          <span>قريتك من هنا</span>
          {mainVillages.map((village) => <a key={village.slug} href={`#village-${village.slug}`}>{village.name}</a>)}
        </nav>
        <div className="section-heading interior-section-heading">
          <div>
            <span className="eyebrow eyebrow--dark">استكشف حسب المكان</span>
            <h2>ابدأ باسم تعرفه… واكتشف الباقي</h2>
            <p>دفتر لكل قرية، يجمع الخدمات المنشورة وأسماء النجوع والتوابع تحت نطاقها.</p>
          </div>
          <span className="interior-section-heading__count">{mainVillages.length.toLocaleString('ar-EG')} قرى</span>
        </div>

        <div className={styles.cards}>
          {mainVillages.map((village, index) => {
            const villageListings = getListingsByVillage(village.name);
            const count = villageListings.length;
            const services = categories.map((category) => ({ category, count: villageListings.filter((listing) => listing.category === category.id).length }))
              .filter((entry) => entry.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);
            return (
              <article id={`village-${village.slug}`} key={village.slug} className={`${styles.villageCard} ${index === 0 ? styles.featuredCard : ''}`}>
                <div className={styles.cardHead}>
                  <span>دفتر قرية</span>
                  <span className={styles.cardIndex} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <h2 className={styles.cardTitle}><Link href={`/villages/${village.slug}`}>{village.name}<span aria-hidden="true">↗</span></Link></h2>
                <p className={styles.cardDescription}>{village.description}</p>
                <div className={styles.cardMetrics}>
                  <span><b>{count.toLocaleString('ar-EG')}</b><small>سجل منشور</small></span>
                  <span><b>{village.localities.length.toLocaleString('ar-EG')}</b><small>نجع وتابع</small></span>
                </div>
                {services.length > 0 && <nav className={styles.serviceLinks} aria-label={`خدمات منشورة في ${village.name}`}>
                  {services.map(({ category, count: serviceCount }) => <Link key={category.id} href={`/directory/${category.id}?village=${encodeURIComponent(village.name)}`}>
                    {category.shortLabel}<b>{serviceCount.toLocaleString('ar-EG')}</b>
                  </Link>)}
                </nav>}
                {village.localities.length > 0 && <details className={styles.localityDetails}>
                  <summary>نجوع {village.name} وتوابعها<span aria-hidden="true">＋</span></summary>
                  <div className={styles.localityLinks}>
                    {village.localities.map((locality) => <Link key={locality} href={`/directory?village=${encodeURIComponent(village.name)}&q=${encodeURIComponent(locality)}`}>{locality}</Link>)}
                  </div>
                </details>}
                <Link href={`/villages/${village.slug}`} className={styles.cardFooter}>افتح دفتر {village.name}<span aria-hidden="true">←</span></Link>
              </article>
            );
          })}
        </div>
        <div className="villages-localities-cta">
          <div>
            <span className="eyebrow eyebrow--light">دليل جغرافي مفصل</span>
            <h2>كل أسماء النجوع والتوابع في صفحة واحدة</h2>
            <p>استعرض الأسماء مرتبة تحت القرية الأم وابحث عن الخدمات داخل كل نطاق محلي.</p>
          </div>
          <Link href="/localities" className="button button--light">استكشف النجوع والتوابع</Link>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
