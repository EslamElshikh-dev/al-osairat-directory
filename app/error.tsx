'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" className="status-page status-page--error">
      <div className="shell status-page__shell">
        <section className="status-card status-card--error" role="alert" aria-labelledby="page-error-title">
          <span className="status-card__mark" aria-hidden="true">
            <span className="brand-mark">
              <span className="brand-mark__ring" />
              <span className="brand-mark__dot" />
              <span className="brand-mark__line" />
            </span>
          </span>
          <span className="status-card__eyebrow">تعذر إكمال الطلب</span>
          <h1 id="page-error-title">حصل خطأ مؤقت</h1>
          <p>بياناتك ما اتغيرتش. جرّب تحميل الجزء ده مرة ثانية، أو ارجع للدليل لو استمرت المشكلة.</p>
          <div className="status-card__actions">
            <button className="button button--primary" type="button" onClick={reset}>إعادة المحاولة</button>
            <Link className="button button--ghost" href="/directory">العودة إلى الدليل</Link>
            <Link className="status-card__home-link" href="/">الرئيسية</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
