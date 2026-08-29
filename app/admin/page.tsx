import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminAnalyticsDashboard } from '@/components/admin/admin-analytics-dashboard';
import { AdminDirectoryIntelligence } from '@/components/admin/admin-directory-intelligence';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { AdminListingReports } from '@/components/admin/admin-listing-reports';
import { resolveAdminSession } from '@/lib/auth/admin-server';

export const metadata: Metadata = {
  title: 'لوحة إدارة الدليل',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await resolveAdminSession({ allowRefresh: false });
  if (!session) redirect('/account');

  return (
    <main id="main-content" className="admin-page admin-page--premium">
      <section className="workspace-hero workspace-hero--admin">
        <div className="shell workspace-hero__grid">
          <div className="workspace-hero__copy">
            <span className="workspace-hero__kicker">
              <span className="brand-mark" aria-hidden="true"><span className="brand-mark__ring" /><span className="brand-mark__dot" /></span>
              مركز تشغيل الدليل
            </span>
            <h1>لوحة إدارة <em>دليل العسيرات</em></h1>
            <p>مركز واحد لمتابعة النمو، قراءة سلوك البحث، مراجعة طلبات الأعضاء وبلاغات البيانات واتخاذ القرار بسرعة.</p>
            <div className="workspace-hero__links">
              <a href="#analytics-overview">الإحصاءات</a>
              <a href="#directory-intelligence">ذكاء البحث</a>
              <a href="#admin-requests">المراجعات</a>
              <a href="#listing-reports">البلاغات</a>
            </div>
          </div>
          <aside className="workspace-hero__panel" aria-label="أقسام لوحة الإدارة">
            <span className="workspace-hero__panel-label">لوحة خاصة · غير مفهرسة</span>
            <div className="workspace-hero__panel-brand">
              <span className="brand-mark" aria-hidden="true"><span className="brand-mark__ring" /><span className="brand-mark__dot" /><span className="brand-mark__line" /></span>
              <strong>تشغيل · قياس · مراجعة</strong>
            </div>
            <div className="workspace-hero__metrics">
              <span><b>01</b><small>قياس الأداء</small></span>
              <span><b>02</b><small>قرارات تشغيلية</small></span>
              <span><b>03</b><small>جودة البيانات</small></span>
            </div>
          </aside>
        </div>
      </section>

      <div className="shell admin-workspace-shell">
        <nav className="admin-section-nav admin-section-nav--premium" aria-label="أقسام لوحة الإدارة">
          <a href="#analytics-overview"><span>01</span>الإحصاءات</a>
          <a href="#directory-intelligence"><span>02</span>ذكاء البحث والأداء</a>
          <a href="#admin-requests"><span>03</span>طلبات ومراجعات الأعضاء</a>
          <a href="#listing-reports"><span>04</span>بلاغات بيانات الأنشطة</a>
        </nav>
        <AdminAnalyticsDashboard />
        <AdminDirectoryIntelligence />
        <div id="admin-requests" className="admin-anchor-section"><AdminDashboard /></div>
        <AdminListingReports />
      </div>
    </main>
  );
}
