import type { Metadata } from 'next';
import { AccountPanel } from '@/components/auth/account-panel';

export const metadata: Metadata = { title: 'حسابي', robots: { index: false, follow: false } };

export default function AccountPage() {
  return <main id="main-content" className="account-page"><div className="shell"><AccountPanel /></div></main>;
}
