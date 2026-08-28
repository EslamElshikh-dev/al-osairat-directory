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
  return (
    <main id="main-content" className="page-main">
      <section className="page-hero shell">
        <span className="eyebrow eyebrow--dark">الجغرافيا المحلية</span>
        <h1>قرى مركز العسيرات</h1>
        <p>تنظيم المحتوى حسب القرية يساعد في الوصول للخدمة الأقرب ويمنع خلط بيانات العسيرات بجرجا أو المنشأة أو مدينة سوهاج.</p>
      </section>
      <section className="shell page-section">
        <div className="village-grid">
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
                <div className="village-card__meta"><span>{count} سجل</span><span>{village.localities.length} تابع/نجع مسجل بالاسم</span></div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
