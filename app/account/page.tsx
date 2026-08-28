import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AccountPanel } from '@/components/auth/account-panel';

export const metadata: Metadata = { title: 'حسابي', robots: { index: false, follow: false } };

export default function AccountPage() {
  if (!process.env.FIREBASE_WEB_API_KEY?.trim()) notFound();
  return <main id="main-content" className="account-page"><div className="shell"><AccountPanel /></div></main>;
}
