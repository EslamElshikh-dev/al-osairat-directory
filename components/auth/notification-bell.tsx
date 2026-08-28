'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

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
    fetch('/api/notifications?limit=1', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        if (response.status === 401) return { authenticated: false, unreadCount: 0 };
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
    load();
    const timer = window.setInterval(load, 60_000);
    const handleChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ unreadCount?: number }>).detail;
      if (typeof detail?.unreadCount === 'number') setUnreadCount(detail.unreadCount);
      else load();
    };
    const handleVisibility = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('notifications:changed', handleChanged);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
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
