'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type User = { localId: string; email: string; displayName: string; emailVerified: boolean };

export function AccountPanel() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.json())
      .then((data) => {
        if (!data.user) router.replace('/account/login');
        else setUser(data.user);
      })
      .catch(() => router.replace('/account/login'))
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => null);
    router.replace('/');
    router.refresh();
  }

  if (loading) return <div className="account-loading" aria-live="polite"><span /><p>جاري تحميل حسابك…</p></div>;
  if (!user) return null;

  const initial = user.displayName.trim().charAt(0) || 'ع';
  return (
    <div className="account-dashboard">
      <section className="account-profile-card">
        <div className="account-avatar" aria-hidden="true">{initial}</div>
        <div className="account-profile-copy">
          <span className="account-kicker">عضو دليل العسيرات</span>
          <h1>{user.displayName}</h1>
          <p>{user.email}</p>
          <span className={`account-status${user.emailVerified ? ' is-verified' : ''}`}>
            <i aria-hidden="true" />
            {user.emailVerified ? 'البريد الإلكتروني مؤكد' : 'البريد الإلكتروني يحتاج تأكيد'}
          </span>
        </div>
      </section>

      {!user.emailVerified && (
        <div className="account-notice">
          <strong>أكد بريدك الإلكتروني</strong>
          <p>أرسلنا رابط التأكيد عند إنشاء الحساب. التأكيد يحمي عضويتك ويساعدنا لاحقًا في تفعيل مزايا الأعضاء بأمان.</p>
        </div>
      )}

      <section className="account-actions-card">
        <div><span>اختصارات العضو</span><h2>واصل استكشاف العسيرات</h2></div>
        <div className="account-quick-links">
          <Link href="/directory">استكشف الدليل <b aria-hidden="true">←</b></Link>
          <Link href="/villages">دليل القرى <b aria-hidden="true">←</b></Link>
          <Link href="/blog">مدونة العسيرات <b aria-hidden="true">←</b></Link>
        </div>
      </section>

      <button className="account-logout" type="button" onClick={logout} disabled={loggingOut}>{loggingOut ? 'جاري تسجيل الخروج…' : 'تسجيل الخروج'}</button>
    </div>
  );
}
