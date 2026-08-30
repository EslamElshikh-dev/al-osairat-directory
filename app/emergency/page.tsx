import type { Metadata } from 'next';
import { listings } from '@/lib/data';
import { CategoryVisual } from '@/components/category-visual';
import { BrandMark } from '@/components/site-shell';
import { buildPageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = buildPageMetadata({
  title: 'أرقام الطوارئ والخدمات المهمة في العسيرات',
  description: 'أرقام الإسعاف والنجدة والحماية المدنية والكهرباء والمياه للاستخدام السريع من داخل مركز العسيرات.',
  path: '/emergency',
  imageAlt: 'أرقام الطوارئ والخدمات المهمة في مركز العسيرات',
});

export default function EmergencyPage() {
  const emergency = listings.filter((item) => item.category === 'emergency');
  const pageUrl = `${siteConfig.url}/emergency`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${pageUrl}#page`,
        url: pageUrl,
        name: 'أرقام الطوارئ والخدمات المهمة في العسيرات',
        description: 'أرقام اتصال سريعة لخدمات الطوارئ والمرافق الأساسية التي يحتاجها سكان مركز العسيرات.',
        isPartOf: { '@id': `${siteConfig.url}#website` },
        mainEntity: { '@id': `${pageUrl}#contacts` },
      },
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#contacts`,
        numberOfItems: emergency.length,
        itemListElement: emergency.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'ContactPoint',
            name: item.title,
            description: item.description,
            contactType: item.subCategory || 'طوارئ',
            telephone: item.phone,
            areaServed: 'EG',
            availableLanguage: 'ar',
          },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'أرقام الطوارئ', item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className="page-main">
      <section className="emergency-hero">
        <div className="shell">
          <span className="eyebrow">للحالات العاجلة</span>
          <h1>أرقام مهمة وسريعة</h1>
          <p>اضغط على الرقم للاتصال مباشرة. استخدم أرقام الطوارئ فقط عند الحاجة الفعلية.</p>
        </div>
      </section>
      <section className="shell page-section">
        <div className="emergency-grid">
          {emergency.map((item) => (
            <a href={`tel:${item.phone}`} key={item.id} className="emergency-card">
              <div className="emergency-card__head">
                <CategoryVisual category="emergency" size="md" />
                <span className="emergency-card__brand" aria-hidden="true"><BrandMark compact /></span>
              </div>
              <span className="emergency-card__type">{item.subCategory}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <strong>{item.phone}</strong>
            </a>
          ))}
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
