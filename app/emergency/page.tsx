import type { Metadata } from 'next';
import { listings } from '@/lib/data';

export const metadata: Metadata = {
  title: 'أرقام الطوارئ والخدمات المهمة في العسيرات',
  description: 'أرقام الإسعاف والنجدة والحماية المدنية والكهرباء والمياه للاستخدام السريع من داخل مركز العسيرات.',
  alternates: { canonical: '/emergency' },
};

export default function EmergencyPage() {
  const emergency = listings.filter((item) => item.category === 'emergency');
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
              <span>{item.subCategory}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <strong>{item.phone}</strong>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
