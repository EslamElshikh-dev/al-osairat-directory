import { BrandMark } from '@/components/site-shell';

export default function Loading() {
  return (
    <main id="main-content" className="status-page status-page--loading status-page--vnext2" aria-busy="true" aria-live="polite">
      <div className="shell status-page__shell">
        <section className="status-card status-card--loading-vnext2" role="status" aria-label="جاري تحميل دليل العسيرات">
          <div className="status-card__loading-head">
            <span className="status-card__mark" aria-hidden="true"><BrandMark /></span>
            <div>
              <span className="status-card__eyebrow">دليل العسيرات · جاري التجهيز</span>
              <h1>بنرتّب لك الطريق للمعلومة.</h1>
              <p>نجهّز البيانات والصفحة المطلوبة من غير ما نرمي قدامك شاشة فاضية.</p>
            </div>
          </div>

          <div className="directory-loading-preview" aria-hidden="true">
            <div className="directory-loading-preview__search"><span /><i /></div>
            <div className="directory-loading-preview__meta"><span /><span /><span /></div>
            <div className="directory-loading-preview__grid">
              <article><i /><span /><span /><b /></article>
              <article><i /><span /><span /><b /></article>
              <article><i /><span /><span /><b /></article>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
