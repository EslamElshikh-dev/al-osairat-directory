import { BrandMark } from '@/components/site-shell';

export default function Loading() {
  return (
    <main id="main-content" className="status-page status-page--loading" aria-busy="true" aria-live="polite">
      <div className="shell status-page__shell">
        <section className="status-card" role="status" aria-label="جاري تحميل دليل العسيرات">
          <span className="status-card__mark" aria-hidden="true"><BrandMark /></span>
          <span className="status-card__eyebrow">جاري تجهيز الصفحة</span>
          <h1>نرتب لك دليل العسيرات</h1>
          <p>لحظات قليلة ونُظهر البيانات والخدمات المحلية المطلوبة.</p>
          <div className="status-skeleton" aria-hidden="true"><span /><span /><span /></div>
        </section>
      </div>
    </main>
  );
}
