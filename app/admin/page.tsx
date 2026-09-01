import type { Metadata } from 'next';
import Link from 'next/link';
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
            <h1>مركز إدارة <em>دليل العسيرات</em></h1>
            <p>واجهة تشغيل دقيقة لمتابعة النمو وسلوك البحث وجودة البيانات، ثم معالجة طلبات الأعضاء والبلاغات حسب الأولوية.</p>
            <nav className="workspace-hero__links" aria-label="اختصارات لوحة الإدارة">
              <a href="#analytics-overview">ملخص الأداء</a>
              <a href="#directory-intelligence">الطلب والبحث</a>
              <a href="#data-quality">سلطة البيانات</a>
              <a href="#admin-requests">صندوق المراجعة</a>
            </nav>
          </div>
          <aside className="workspace-hero__panel workspace-hero__panel--admin" aria-label="جلسة الإدارة الحالية">
            <span className="workspace-hero__panel-label">جلسة إدارة موثقة · غير مفهرسة</span>
            <div className="workspace-hero__panel-brand">
              <span className="brand-mark" aria-hidden="true"><span className="brand-mark__ring" /><span className="brand-mark__dot" /><span className="brand-mark__line" /></span>
              <div><small>مدير الدليل</small><strong>{session.displayName}</strong></div>
            </div>
            <div className="workspace-hero__metrics">
              <span><b>01</b><small>بيانات مباشرة</small></span>
              <span><b>02</b><small>قرارات موثقة</small></span>
              <span><b>03</b><small>وصول محمي</small></span>
            </div>
            <div className="workspace-hero__admin-actions">
              <Link href="/account">العودة إلى حسابي</Link>
              <Link href="/">عرض الدليل</Link>
            </div>
          </aside>
        </div>
      </section>

      <div className="shell admin-workspace-shell">
        <nav className="admin-section-nav admin-section-nav--premium" aria-label="أقسام لوحة الإدارة">
          <a href="#analytics-overview"><span>01</span>ملخص الأداء</a>
          <a href="#directory-intelligence"><span>02</span>ذكاء البحث</a>
          <a href="#data-quality"><span>03</span>جودة البيانات</a>
          <a href="#authority-batch"><span>04</span>دفعة التوثيق</a>
          <a href="#admin-requests"><span>05</span>طلبات الأعضاء</a>
          <a href="#listing-reports"><span>06</span>البلاغات</a>
        </nav>
        <AdminAnalyticsDashboard />
        <AdminDirectoryIntelligence />
        <AdminDataQuality />
        <AdminAuthorityBatch />
        <div id="admin-requests" className="admin-anchor-section"><AdminDashboard /></div>
        <AdminListingReports />
      </div>
    </main>
  );
}
