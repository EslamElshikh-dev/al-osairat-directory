import type { Metadata } from 'next';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

export const metadata: Metadata = {
  title: 'لوحة إدارة الدليل',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main id="main-content" className="admin-page">
      <div className="shell">
        <AdminDashboard />
      </div>
    </main>
  );
}
