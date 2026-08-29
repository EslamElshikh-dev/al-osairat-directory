import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark } from '@/components/site-shell';
import { listings } from '@/lib/data';
import { mergeDirectoryListings } from '@/lib/directory-query';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
import { getEligibleServiceIntents, getProgrammaticCollectionStats } from '@/lib/programmatic-seo';
import { siteConfig } from '@/lib/site';

const pageTitle = 'خدمات العسيرات حسب التخصص';
const pageDescription = 'صفحات متخصصة للخدمات التي لديها بيانات كافية وطلب بحث واضح داخل دليل العسيرات، بدون إنشاء صفحات ضعيفة أو مكررة.';

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: '/services' },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: `${siteConfig.url}/services`,
  },
};

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const [publishedListings, baseListings] = await Promise.all([
    getPublishedListings(),
    applyListingOverrides(listings),
  ]);
  const allListings = mergeDirectoryListings(baseListings, publishedListings);
  const eligible = getEligibleServiceIntents(allListings);
  const canonicalUrl = `${siteConfig.url}/services`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#collection`,
        name: pageTitle,
        description: pageDescription,
        url: canonicalUrl,
        inLanguage: 'ar-EG',
        isPartOf: { '@type': 'WebSite', '@id': `${siteConfig.url}#website` },
        mainEntity: { '@id': `${canonicalUrl}#item-list` },
      },
      {
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#item-list`,
        numberOfItems: eligible.length,
        itemListElement: eligible.map(({ intent }, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: intent.label,
          url: `${siteConfig.url}/services/${intent.id}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'الخدمات', item: canonicalUrl },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className="page-main interior-redesign">
      <section className="catalog-hero catalog-hero--directory">
        <div className="shell catalog-hero__grid">
          <div className="catalog-hero__copy">
            <span className="catalog-hero__kicker"><BrandMark compact /> بحث حسب التخصص</span>
            <h1>خدمات العسيرات <em>حسب التخصص</em></h1>
            <p>صفحات منتقاة لا تظهر إلا عندما يتوفر لها عدد كافٍ من السجلات وبيانات قابلة للاستخدام، بدل إنشاء صفحات آلية متشابهة بلا قيمة حقيقية.</p>
            <div className="catalog-hero__actions">
              <Link href="#service-intents" className="button button--light">استكشف الخدمات</Link>
              <Link href="/directory" className="button button--outline-light">الدليل الكامل</Link>
            </div>
          </div>
          <aside className="catalog-hero__summary" aria-label="ملخص صفحات الخدمات">
            <span className="catalog-hero__summary-label">صفحات مؤهلة حاليًا</span>
            <div className="catalog-hero__metrics catalog-hero__metrics--two">
              <span><b>{eligible.length.toLocaleString('ar-EG')}</b><small>تخصصات مستقلة</small></span>
              <span><b>{eligible.reduce((sum, item) => sum + item.listings.length, 0).toLocaleString('ar-EG')}</b><small>سجلًا مطابقًا</small></span>
            </div>
          </aside>
        </div>
      </section>

      <section id="service-intents" className="shell seo-growth-hub" aria-labelledby="service-intents-title">
        <div className="seo-growth-hub__heading">
          <span>بحث أكثر دقة</span>
          <h2 id="service-intents-title">اختر الخدمة التي تبحث عنها</h2>
          <p>كل صفحة أدناه مبنية على تخصص ظاهر في بيانات السجلات نفسها، وتُراجع أهليتها آليًا بحسب العدد واكتمال البيانات.</p>
        </div>
        {eligible.length > 0 ? (
          <nav className="seo-growth-hub__links" aria-label="الخدمات المتخصصة في العسيرات">
            {eligible.map(({ intent, listings: matched }) => {
              const stats = getProgrammaticCollectionStats(matched);
              return (
                <Link key={intent.id} href={`/services/${intent.id}`}>
                  <span>{intent.label}</span>
                  <small>{stats.total.toLocaleString('ar-EG')} سجل · {stats.villages.toLocaleString('ar-EG')} نطاق</small>
                </Link>
              );
            })}
          </nav>
        ) : (
          <div className="empty-state"><strong>لا توجد صفحات متخصصة مؤهلة بعد</strong><p>ستظل نتائج الخدمات متاحة من البحث الرئيسي حتى تتوفر بيانات كافية لإنشاء صفحة مستقلة ذات قيمة.</p></div>
        )}
      </section>

      <section className="shell seo-growth-hub seo-growth-hub--compact" aria-labelledby="programmatic-policy-title">
        <div className="seo-growth-hub__heading">
          <span>جودة قبل الكمية</span>
          <h2 id="programmatic-policy-title">لماذا لا ننشئ صفحة لكل كلمة؟</h2>
          <p>لأن صفحات الدليل المتخصصة يجب أن تحل حاجة فعلية للزائر. التخصص الذي لا يملك بيانات كافية يبقى ضمن البحث والفلاتر، ولا يحصل على صفحة قابلة للفهرسة إلا بعد تجاوز حد الجودة والاكتمال.</p>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
