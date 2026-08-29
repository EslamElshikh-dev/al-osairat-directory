'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ensureClientSession, setClientSessionUser } from './client-session';

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 9.5a6 6 0 0 0-12 0c0 7-2.5 7-2.5 8.5h17C20.5 16.5 18 16.5 18 9.5Z" />
      <path d="M9.5 20a2.8 2.8 0 0 0 5 0" />
    </svg>
  );
}

export function NotificationBell() {
  const [visible, setVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(() => {
    return fetch('/api/notifications?limit=1', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        if (response.status === 401) {
          setClientSessionUser(null);
          return { authenticated: false, unreadCount: 0 };
        }
        if (!response.ok) throw new Error('LOAD_FAILED');
        return response.json();
      })
      .then((data) => {
        setVisible(Boolean(data.authenticated));
        setUnreadCount(Number(data.unreadCount || 0));
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    let active = true;
    let timer: number | null = null;

    const startForMember = async () => {
      const user = await ensureClientSession();
      if (!active || !user) {
        if (active) {
          setVisible(false);
          setUnreadCount(0);
        }
        return;
      }

      setVisible(true);
      await load();
      if (!active) return;
      timer = window.setInterval(load, 60_000);
    };

    void startForMember();

    const handleChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ unreadCount?: number }>).detail;
      if (typeof detail?.unreadCount === 'number') setUnreadCount(detail.unreadCount);
      else void ensureClientSession().then((user) => { if (user) void load(); });
    };
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      void ensureClientSession().then((user) => { if (user) void load(); });
    };

    window.addEventListener('notifications:changed', handleChanged);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      active = false;
      if (timer !== null) window.clearInterval(timer);
      window.removeEventListener('notifications:changed', handleChanged);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [load]);

  if (!visible) return null;

  const badge = unreadCount > 99 ? '99+' : String(unreadCount);
  return (
    <Link
      href="/account#notifications"
      className={`notification-bell${unreadCount ? ' has-unread' : ''}`}
      aria-label={unreadCount ? `لديك ${unreadCount} إشعارات غير مقروءة` : 'الإشعارات'}
      title="الإشعارات"
    >
      <BellIcon />
      {unreadCount > 0 && <span>{badge}</span>}
    </Link>
  );
}
