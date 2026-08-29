'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ClientSessionUser,
  ensureClientSession,
  subscribeClientSession,
  updateClientSessionUser,
} from './client-session';

type ProfileUpdatedDetail = { displayName?: string; avatarUrl?: string };

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.8 19.2c.8-3.2 3-5 6.2-5s5.4 1.8 6.2 5" />
    </svg>
  );
}

export function AccountButton() {
  const [user, setUser] = useState<ClientSessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeClientSession((nextUser) => {
      if (!active || nextUser === undefined) return;
      setUser(nextUser);
      setReady(true);
    });

    void ensureClientSession().finally(() => {
      if (active) setReady(true);
    });

    const handleProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ProfileUpdatedDetail>).detail || {};
      updateClientSessionUser({
        ...(detail.displayName ? { displayName: detail.displayName } : {}),
        ...(detail.avatarUrl !== undefined ? { avatarUrl: detail.avatarUrl } : {}),
      });
    };
    window.addEventListener('member:profile-updated', handleProfileUpdated);

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('member:profile-updated', handleProfileUpdated);
    };
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
