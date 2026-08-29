import type { Metadata } from 'next';
import Link from 'next/link';
import { TransportSubmissionForm } from '@/components/transport-submission-form';

export const metadata: Metadata = {
  title: 'أضف سائقًا أو وسيلة مواصلات',
  description: 'إرسال بيانات سائق أو سيارة أو ميكروباص أو توك توك أو وسيلة مواصلات تعمل داخل مركز العسيرات وقراه للمراجعة قبل النشر.',
  robots: { index: false, follow: true },
};

export default function AddTransportPage() {
  return (
    <main id="main-content" className="account-page account-page--premium">
      <section className="workspace-hero workspace-hero--member">
        <div className="shell workspace-hero__grid">
          <div className="workspace-hero__copy">
            <span className="workspace-hero__kicker">
              <span className="brand-mark" aria-hidden="true"><span className="brand-mark__ring" /><span className="brand-mark__dot" /></span>
              المواصلات المحلية
            </span>
            <h1>أضف سائقًا أو <em>وسيلة مواصلات</em></h1>
            <p>ساعد أهل المركز في الوصول إلى خدمة نقل موثوقة. أرسل بيانات الخدمة وخط السير ووسيلة التواصل، ولن تظهر البيانات في الدليل إلا بعد المراجعة.</p>
            <nav className="workspace-hero__links" aria-label="اختصارات قسم المواصلات">
              <Link href="/directory/transport">قسم المواصلات</Link>
              <Link href="/account#business-submissions">متابعة طلباتي</Link>
            </nav>
          </div>
          <aside className="workspace-hero__panel" aria-label="خطوات إضافة وسيلة مواصلات">
            <span className="workspace-hero__panel-label">قبل النشر</span>
            <div className="workspace-hero__panel-brand">
              <span className="brand-mark" aria-hidden="true"><span className="brand-mark__ring" /><span className="brand-mark__dot" /><span className="brand-mark__line" /></span>
              <strong>بيانات واضحة ومراجعة بشرية</strong>
            </div>
            <div className="workspace-hero__metrics">
              <span><b>01</b><small>نوع المركبة</small></span>
              <span><b>02</b><small>خط السير</small></span>
              <span><b>03</b><small>اتصال أو واتساب</small></span>
            </div>
          </aside>
        </div>
      </section>

      <div className="shell account-workspace-shell">
        <TransportSubmissionForm />
      </div>
    </main>
  );
}
