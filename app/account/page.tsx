import type { Metadata } from 'next';
import { AccountPanel } from '@/components/auth/account-panel';
import { OwnedListingPerformance } from '@/components/auth/owned-listing-performance';

export const metadata: Metadata = { title: 'حسابي', robots: { index: false, follow: false } };

export default function AccountPage() {
  return (
    <main id="main-content" className="account-page account-page--premium">
      <section className="workspace-hero workspace-hero--member">
        <div className="shell workspace-hero__grid">
          <div className="workspace-hero__copy">
            <span className="workspace-hero__kicker">
              <span className="brand-mark" aria-hidden="true"><span className="brand-mark__ring" /><span className="brand-mark__dot" /></span>
              مساحة العضو
            </span>
            <h1>حسابك داخل <em>دليل العسيرات</em></h1>
            <p>حدّث بياناتك، تابع طلباتك، أدر الأنشطة التي تملكها وراقب أداءها من مساحة واحدة منظمة وواضحة.</p>
            <nav className="workspace-hero__links" aria-label="اختصارات حساب العضو">
              <a href="#account-profile">الملف الشخصي</a>
              <a href="#business-submissions">إضافة نشاط</a>
              <a href="#ownership-claims">مطالبات الملكية</a>
              <a href="#my-businesses">أنشطتي</a>
              <a href="#owned-performance">الأداء</a>
            </nav>
          </div>
          <aside className="workspace-hero__panel" aria-label="مزايا حساب العضو">
            <span className="workspace-hero__panel-label">مركز العضوية</span>
            <div className="workspace-hero__panel-brand">
              <span className="brand-mark" aria-hidden="true"><span className="brand-mark__ring" /><span className="brand-mark__dot" /><span className="brand-mark__line" /></span>
              <strong>كل أدواتك في مكان واحد</strong>
            </div>
            <div className="workspace-hero__metrics">
              <span><b>01</b><small>ملف شخصي</small></span>
              <span><b>02</b><small>إدارة الأنشطة</small></span>
              <span><b>03</b><small>متابعة الأداء</small></span>
            </div>
          </aside>
        </div>
      </section>

      <div className="shell account-workspace-shell">
        <AccountPanel />
        <div id="owned-performance" className="account-anchor-section"><OwnedListingPerformance /></div>
      </div>
    </main>
  );
}
