'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type SessionUser = { displayName: string; email: string; avatarUrl: string } | null;

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.8 19.2c.8-3.2 3-5 6.2-5s5.4 1.8 6.2 5" />
    </svg>
  );
}

export function AccountButton() {
  const [user, setUser] = useState<SessionUser>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : { user: null })
      .then((data) => { if (active) setUser(data.user || null); })
      .catch(() => null)
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const label = user ? (user.displayName?.split(' ')[0] || 'حسابي') : 'دخول';
  const initial = user?.displayName?.trim()?.charAt(0);

  return (
    <Link
      href={user ? '/account' : '/account/login'}
      className={`account-trigger${user ? ' is-signed-in' : ''}`}
      aria-label={user ? `حساب ${user.displayName}` : 'تسجيل الدخول أو إنشاء حساب'}
      title={ready && user ? user.displayName : 'حساب الأعضاء'}
    >
      <span className={`account-trigger__icon${user?.avatarUrl ? ' has-photo' : ''}`} aria-hidden="true">
        {user?.avatarUrl ? (
          <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
        ) : initial ? (
          <b>{initial}</b>
        ) : (
          <AccountIcon />
        )}
      </span>
      <span className="account-trigger__label">{ready ? label : 'حسابي'}</span>
    </Link>
  );
}
