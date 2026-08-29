export default function Loading() {
  return (
    <main id="main-content" className="status-page status-page--loading" aria-busy="true">
      <div className="shell status-page__shell">
        <section className="status-card" role="status" aria-live="polite" aria-labelledby="page-loading-title">
          <span className="status-card__mark" aria-hidden="true">
            <span className="brand-mark">
              <span className="brand-mark__ring" />
              <span className="brand-mark__dot" />
              <span className="brand-mark__line" />
            </span>
          </span>
          <span className="status-card__eyebrow">دليل العسيرات</span>
          <h1 id="page-loading-title">جاري تجهيز الصفحة…</h1>
          <p>لحظات بسيطة ونكمل من نفس المكان.</p>
          <div className="status-skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>
      </div>
    </main>
  );
}
