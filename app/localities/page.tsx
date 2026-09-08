import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark } from '@/components/site-shell';
import { villages } from '@/lib/data';
import { buildPageMetadata } from '@/lib/metadata';
import { isFallbackScope } from '@/lib/seo-growth';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = buildPageMetadata({
  title: 'نجوع وقرى العسيرات - الدليل الجغرافي الكامل',
  description: 'دليل أسماء قرى ونجوع وتوابع مركز العسيرات بمحافظة سوهاج، مرتب حسب القرية الأم مع روابط للوصول إلى الخدمات والأنشطة المحلية.',
  path: '/localities',
  imageAlt: 'نجوع وقرى مركز العسيرات بمحافظة سوهاج',
});

export default function LocalitiesPage() {
  const mainVillages = villages.filter((village) => !isFallbackScope(village.name));
  const localities = mainVillages.flatMap((village) =>
    village.localities.map((locality) => ({ locality, village })),
  );
  const pageUrl = `${siteConfig.url}/localities`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#page`,
        url: pageUrl,
        name: 'نجوع وقرى العسيرات',
        description: 'الدليل الجغرافي لأسماء القرى والنجوع والتوابع داخل مركز العسيرات بمحافظة سوهاج.',
        inLanguage: 'ar-EG',
        isPartOf: { '@id': `${siteConfig.url}#website` },
        mainEntity: { '@id': `${pageUrl}#localities` },
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#localities`,
        name: 'أسماء نجوع وتوابع مركز العسيرات',
        numberOfItems: localities.length,
        itemListElement: localities.map(({ locality, village }, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Place',
            name: locality,
            url: `${siteConfig.url}/villages/${village.slug}#localities`,
            containedInPlace: {
              '@type': 'Place',
              name: village.name,
              containedInPlace: { '@type': 'AdministrativeArea', name: 'مركز العسيرات، سوهاج، مصر' },
            },
          },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'نجوع وقرى العسيرات', item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className="page-main interior-redesign localities-page">
      <section className="localities-hero">
        <div className="shell localities-hero__grid">
          <div className="localities-hero__copy">
            <span className="catalog-hero__kicker"><BrandMark compact /> الدليل الجغرافي المحلي</span>
            <h1>نجوع وقرى <em>العسيرات</em></h1>
            <p>
              اعثر على اسم القرية أو النجع أو التابع، ثم انتقل مباشرة إلى دليل القرية والخدمات
              والأنشطة المسجلة داخل نطاقها.
            </p>
            <div className="catalog-hero__actions">
              <Link href="#localities-index" className="button button--light">استكشف الأسماء</Link>
              <Link href="/villages" className="button button--outline-light">صفحات القرى</Link>
            </div>
          </div>

          <aside className="localities-hero__metrics" aria-label="ملخص الدليل الجغرافي">
            <span className="localities-hero__mark" aria-hidden="true"><BrandMark /></span>
            <strong>تغطية مركز العسيرات</strong>
            <p>كل نجع وتابع موضوع تحت القرية الأم لتسهيل البحث والوصول.</p>
            <div>
              <span><b>{mainVillages.length.toLocaleString('ar-EG')}</b><small>قرى أساسية</small></span>
              <span><b>{localities.length.toLocaleString('ar-EG')}</b><small>نجعًا وتابعًا</small></span>
            </div>
          </aside>
        </div>
      </section>

      <section id="localities-index" className="shell page-section localities-index">
        <div className="section-heading interior-section-heading">
          <div>
            <span className="eyebrow eyebrow--dark">الأسماء حسب القرية الأم</span>
            <h2>الدليل الكامل لنجوع العسيرات</h2>
            <p>اختر اسم النجع للبحث عنه داخل أنشطة القرية، أو افتح صفحة القرية لعرض كل بياناتها.</p>
          </div>
          <span className="interior-section-heading__count">{localities.length.toLocaleString('ar-EG')} اسمًا محليًا</span>
        </div>

        <div className="localities-grid">
          {mainVillages.map((village, index) => (
            <article className="locality-group" key={village.slug}>
              <header className="locality-group__header">
                <span className="locality-group__index">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <span>القرية الأم</span>
                  <h2>{village.name}</h2>
                </div>
                <strong>{village.localities.length.toLocaleString('ar-EG')}</strong>
              </header>
              <div className="locality-group__list">
                {village.localities.map((locality) => (
                  <Link
                    key={locality}
                    href={`/directory?village=${encodeURIComponent(village.name)}&q=${encodeURIComponent(locality)}`}
                  >
                    <span>{locality}</span>
                    <b aria-hidden="true">←</b>
                  </Link>
                ))}
              </div>
              <Link className="locality-group__village-link" href={`/villages/${village.slug}`}>
                فتح دليل {village.name} بالكامل <b aria-hidden="true">←</b>
              </Link>
            </article>
          ))}
        </div>

        <div className="localities-cta">
          <div>
            <span className="eyebrow eyebrow--light">ابحث باسم النشاط أو المكان</span>
            <h2>تبحث عن خدمة داخل قرية أو نجع؟</h2>
            <p>اكتب اسم النشاط أو التخصص وحدد القرية للوصول إلى النتائج المتاحة في الدليل.</p>
          </div>
          <Link href="/directory" className="button button--light">افتح دليل الأنشطة</Link>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
