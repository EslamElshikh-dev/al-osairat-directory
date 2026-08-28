import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
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
        <AdminDashboard />
      </div>
    </main>
  );
}
