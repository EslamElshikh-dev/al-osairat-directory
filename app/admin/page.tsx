import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminAnalyticsDashboard } from '@/components/admin/admin-analytics-dashboard';
import { AdminAuthorityBatch } from '@/components/admin/admin-authority-batch';
import { AdminDataQuality } from '@/components/admin/admin-data-quality';
import { AdminDirectoryIntelligence } from '@/components/admin/admin-directory-intelligence';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { AdminListingReports } from '@/components/admin/admin-listing-reports';
import { resolveAdminSession } from '@/lib/auth/admin-server';

export const metadata: Metadata = {
  title: 'لوحة إدارة الدليل',
  robots: { index: false, follow: false, noarchive: true, nocache: true },
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
              جلسة الإدارة المصرح بها
            </span>
            <h1>مركز تشغيل <em>دليل العسيرات</em></h1>
            <p>مرحبًا {session.displayName}. ابدأ بالعمل المفتوح، ثم راجع البلاغات ومؤشرات النمو وجودة بيانات الدليل بترتيب تنفيذي واضح.</p>
            <nav className="workspace-hero__links" aria-label="اختصارات لوحة الإدارة">
              <a href="#analytics-overview">النظرة التنفيذية</a>
              <a href="#admin-requests">صندوق العمل</a>
              <a href="#listing-reports">بلاغات البيانات</a>
              <a href="#directory-intelligence">ذكاء البحث</a>
              <a href="#data-quality">جودة الدليل</a>
            </nav>
          </div>
          <aside className="workspace-hero__panel" aria-label="أقسام لوحة الإدارة">
            <span className="workspace-hero__panel-label">خاصة بحساب مدير الدليل فقط</span>
            <div className="workspace-hero__panel-brand">
              <span className="brand-mark" aria-hidden="true"><span className="brand-mark__ring" /><span className="brand-mark__dot" /><span className="brand-mark__line" /></span>
              <strong>قرار · متابعة · جودة</strong>
            </div>
            <div className="workspace-hero__metrics">
              <span><b>خاص</b><small>وصول إداري</small></span>
              <span><b>مباشر</b><small>بيانات محدثة</small></span>
              <span><b>آمن</b><small>غير مفهرس</small></span>
            </div>
          </aside>
        </div>
      </section>

      <div className="shell admin-workspace-shell">
        <nav className="admin-section-nav admin-section-nav--premium" aria-label="أقسام لوحة الإدارة">
          <a href="#analytics-overview"><span>01</span>النظرة التنفيذية</a>
          <a href="#admin-requests"><span>02</span>طلبات تحتاج إجراء</a>
          <a href="#listing-reports"><span>03</span>بلاغات البيانات</a>
          <a href="#directory-intelligence"><span>04</span>ذكاء البحث والأداء</a>
          <a href="#data-quality"><span>05</span>جودة وسلطة البيانات</a>
        </nav>
        <AdminAnalyticsDashboard />
        <div id="admin-requests" className="admin-anchor-section"><AdminDashboard /></div>
        <AdminListingReports />
        <AdminDirectoryIntelligence />
        <AdminDataQuality />
        <AdminAuthorityBatch />
      </div>
    </main>
  );
}
