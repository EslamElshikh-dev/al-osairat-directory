import type { Metadata } from 'next';
import Link from 'next/link';
import { getListingsByVillage, villages } from '@/lib/data';
import { BrandMark } from '@/components/site-shell';

export const metadata: Metadata = {
  title: 'قرى مركز العسيرات وتوابعها',
  description: 'استكشف القرى الأساسية والتوابع والخدمات المسجلة في نطاق مركز العسيرات بمحافظة سوهاج.',
  alternates: { canonical: '/villages' },
};

export default function VillagesPage() {
  const mainVillages = villages.filter((village) => village.name !== 'مركز العسيرات');
  const totalListings = mainVillages.reduce((sum, village) => sum + getListingsByVillage(village.name).length, 0);
  const totalLocalities = mainVillages.reduce((sum, village) => sum + village.localities.length, 0);

  return (
    <main id="main-content" className="page-main interior-redesign">
      <section className="geo-hero">
        <div className="shell geo-hero__grid">
          <div className="geo-hero__copy">
            <span className="catalog-hero__kicker"><BrandMark compact /> الجغرافيا المحلية</span>
            <h1>قرى مركز <em>العسيرات</em></h1>
            <p>استكشف الدليل حسب القرية والتوابع المحلية، مع فصل واضح لنطاق العسيرات عن المراكز والمدن المجاورة.</p>
            <div className="catalog-hero__actions">
              <Link href="#villages-grid" className="button button--light">استكشف القرى</Link>
              <Link href="/directory" className="button button--outline-light">فتح الدليل الشامل</Link>
            </div>
          </div>

          <aside className="geo-hero__panel" aria-label="ملخص القرى">
            <span className="geo-hero__mark" aria-hidden="true"><BrandMark /></span>
            <strong>مركز العسيرات · سوهاج</strong>
            <p>هيكل محلي منظم يساعدك على الوصول للخدمة حسب القرية والنجع والتابع.</p>
            <div className="catalog-hero__metrics">
              <span><b>{mainVillages.length.toLocaleString('ar-EG')}</b><small>قرى أساسية</small></span>
              <span><b>{totalLocalities.toLocaleString('ar-EG')}</b><small>توابع مسماة</small></span>
              <span><b>{totalListings.toLocaleString('ar-EG')}</b><small>سجلًا مرتبطًا</small></span>
            </div>
          </aside>
        </div>
      </section>

      <section id="villages-grid" className="shell page-section villages-showcase">
        <div className="section-heading interior-section-heading">
          <div>
            <span className="eyebrow eyebrow--dark">استكشف حسب المكان</span>
            <h2>كل قرية لها صفحة مستقلة</h2>
            <p>تظهر داخل كل صفحة الأقسام المتاحة والتوابع والأنشطة المنشورة في نفس النطاق.</p>
          </div>
          <span className="interior-section-heading__count">{mainVillages.length.toLocaleString('ar-EG')} قرى</span>
        </div>

        <div className="village-grid village-grid--premium">
          {mainVillages.map((village, index) => {
            const count = getListingsByVillage(village.name).length;
            return (
              <Link href={`/villages/${village.slug}`} key={village.slug} className="village-card">
                <div className="village-card__head">
                  <span className="village-card__visual" aria-hidden="true"><BrandMark compact /></span>
                  <span className="village-card__index">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <h2>{village.name}</h2>
                <p>{village.description}</p>
                <div className="village-card__meta">
                  <span><b>{count.toLocaleString('ar-EG')}</b> سجل</span>
                  <span><b>{village.localities.length.toLocaleString('ar-EG')}</b> تابع/نجع</span>
                </div>
                <span className="village-card__cta">فتح دليل القرية ←</span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
