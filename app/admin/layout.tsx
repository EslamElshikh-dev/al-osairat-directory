import type { Metadata } from 'next';
import '../admin.css';
import '../admin-changes.css';
import '../admin-reports.css';
import '../admin-analytics.css';
import '../admin-analytics-insights.css';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
