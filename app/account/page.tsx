import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AccountPanel } from '@/components/auth/account-panel';

export const metadata: Metadata = { title: 'حسابي', robots: { index: false, follow: false } };

export default function AccountPage() {
  if (process.env.NEXT_PUBLIC_AUTH_ENABLED !== 'true') notFound();
  return <main id="main-content" className="account-page"><div className="shell"><AccountPanel /></div></main>;
}
