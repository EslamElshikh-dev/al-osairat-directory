'use client';

import Image from '@/components/site-image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ClientSessionUser } from './client-session';
import {
  ensureClientSession,
  refreshClientSession,
  subscribeClientSession,
  updateClientSessionUser,
  readProfileHint,
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
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const [user, setUser] = useState<ClientSessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState('');
  const [hint, setHint] = useState<{displayName: string; avatarUrl: string} | null>(null);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const open = openedAt === pathname;

  useEffect(() => { setHint(readProfileHint()); }, []);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpenedAt(null);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpenedAt(null); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [open]);

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

  useEffect(() => {
    const previous = previousPath.current;
    previousPath.current = pathname;
    setOpenedAt(null);

    const completedLogin =
      (previous === '/account/login' || previous === '/account/register') && pathname === '/account';
    const possiblyLoggedOut = previous === '/account' && pathname === '/';

    if (completedLogin || possiblyLoggedOut) {
      void refreshClientSession().finally(() => setReady(true));
    }
  }, [pathname]);

  const label = user ? (user.displayName?.split(' ')[0] || 'حسابي') : 'دخول';
  const avatarUrl = user?.avatarUrl || (!ready ? hint?.avatarUrl : '') || '';

  return (
    <div className="account-menu" ref={root}>
    <button
      ref={trigger}
      type="button"
      onClick={() => setOpenedAt(open ? null : pathname)}
      className={`account-trigger${user ? ' is-signed-in' : ''}`}
      aria-label={user ? `قائمة حساب ${user.displayName}` : 'افتح قائمة الحساب'}
      aria-expanded={open}
      aria-controls="account-menu-links"
      title={ready && user ? user.displayName : 'حساب الأعضاء'}
    >
      <span className={`account-trigger__icon${avatarUrl ? ' has-photo' : ''}`} aria-hidden="true">
        <AccountIcon />
        {avatarUrl && failedAvatarUrl !== avatarUrl ? (
          <Image
            key={avatarUrl}
            src={avatarUrl}
            alt=""
            width={32}
            height={32}
            sizes="32px"
            loading="eager"
            fetchPriority="high"
            unoptimized
            referrerPolicy="no-referrer"
            onError={() => setFailedAvatarUrl(avatarUrl)}
          />
        ) : null}
      </span>
      <span className="account-trigger__label">{ready ? label : 'حسابي'}</span>
    </button>
    {open && <nav id="account-menu-links" className="account-menu__links" aria-label="حساب العضو" onClick={() => setOpenedAt(null)}>
      {user ? <>
        <strong>{user.displayName}</strong>
        <Link prefetch={false} href="/account">حسابي</Link>
        <Link prefetch={false} href="/account#account-profile">الملف الشخصي</Link>
        <Link prefetch={false} href="/account#my-businesses">أنشطتي</Link>
        <Link prefetch={false} href="/account#account-favorites">المفضلة</Link>
      </> : <>
        <Link prefetch={false} href="/account/login">تسجيل الدخول</Link>
        <Link prefetch={false} href="/account/register">إنشاء حساب</Link>
      </>}
    </nav>}
    </div>
  );
}
