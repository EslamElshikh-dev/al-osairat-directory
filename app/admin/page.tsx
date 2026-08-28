import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
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
    <main id="main-content" className="admin-page">
      <div className="shell">
        <nav className="admin-section-nav" aria-label="أقسام لوحة الإدارة">
          <a href="#admin-requests">طلبات ومراجعات الأعضاء</a>
          <a href="#listing-reports">بلاغات بيانات الأنشطة</a>
        </nav>
        <div id="admin-requests"><AdminDashboard /></div>
        <AdminListingReports />
      </div>
    </main>
  );
}
