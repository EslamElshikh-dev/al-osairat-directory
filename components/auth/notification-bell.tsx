'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ensureClientSession,
  setClientSessionUser,
  subscribeClientSession,
} from './client-session';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 9.5a6 6 0 0 0-12 0c0 7-2.5 7-2.5 8.5h17C20.5 16.5 18 16.5 18 9.5Z" />
      <path d="M9.5 20a2.8 2.8 0 0 0 5 0" />
    </svg>
  );
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function iconFor(type: string) {
  if (
    type.includes('approved') ||
    type.includes('published') ||
    type.includes('corrected') ||
    type.includes('resolved')
  ) return '✓';
  if (type.includes('rejected')) return '×';
  if (type.includes('needs_changes')) return '!';
  if (type.includes('reviewing')) return '…';
  return '•';
}

export function NotificationBell() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [savingId, setSavingId] = useState('');

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

  const loadMenu = useCallback(async () => {
    setMenuLoading(true);
    setMenuError('');
    try {
      const response = await fetch('/api/notifications?limit=6', { cache: 'no-store', credentials: 'same-origin' });
      if (response.status === 401) {
        setClientSessionUser(null);
        setVisible(false);
        setOpen(false);
        return;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error('LOAD_FAILED');
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(Number(data.unreadCount || 0));
    } catch {
      setMenuError('تعذر تحميل الإشعارات الآن.');
    } finally {
      setMenuLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let timer: number | null = null;

    const stopPolling = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const syncForSession = (user: Parameters<Parameters<typeof subscribeClientSession>[0]>[0]) => {
      if (!active || user === undefined) return;
      if (!user) {
        stopPolling();
        setVisible(false);
        setOpen(false);
        setUnreadCount(0);
        setItems([]);
        return;
      }

      setVisible(true);
      void load();
      if (timer === null) timer = window.setInterval(load, 60_000);
    };

    const unsubscribe = subscribeClientSession(syncForSession);
    void ensureClientSession();

    const handleChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ unreadCount?: number }>).detail;
      if (typeof detail?.unreadCount === 'number') setUnreadCount(detail.unreadCount);
      else void ensureClientSession().then((user) => { if (user) void load(); });
      if (open) void loadMenu();
    };
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      void ensureClientSession().then((user) => { if (user) void load(); });
    };

    window.addEventListener('notifications:changed', handleChanged);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      active = false;
      stopPolling();
      unsubscribe();
      window.removeEventListener('notifications:changed', handleChanged);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [load, loadMenu, open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!visible) return null;

  const badge = unreadCount > 99 ? '99+' : String(unreadCount);

  function toggleMenu() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) void loadMenu();
  }

  async function openNotification(item: NotificationItem) {
    if (savingId) return;
    if (!item.readAt) {
      setSavingId(item.id);
      try {
        const response = await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ action: 'read', id: item.id }),
        });
        if (response.ok) {
          const now = new Date().toISOString();
          setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: now } : entry));
          setUnreadCount((current) => Math.max(0, current - 1));
          window.dispatchEvent(new CustomEvent('notifications:changed', {
            detail: { unreadCount: Math.max(0, unreadCount - 1) },
          }));
        }
      } finally {
        setSavingId('');
      }
    }
    setOpen(false);
    router.push(item.href || '/account#notifications');
  }

  return (
    <div className={`notification-popover${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className={`notification-bell${unreadCount ? ' has-unread' : ''}`}
        aria-label={unreadCount ? `لديك ${unreadCount} إشعارات غير مقروءة` : 'الإشعارات'}
        aria-haspopup="menu"
        aria-expanded={open}
        title="الإشعارات"
        onClick={toggleMenu}
      >
        <BellIcon />
        {unreadCount > 0 && <span>{badge}</span>}
      </button>

      {open ? (
        <div className="notification-popover__panel" role="menu" aria-label="آخر الإشعارات">
          <div className="notification-popover__head">
            <div>
              <span>آخر التحديثات</span>
              <strong>الإشعارات</strong>
            </div>
            <span className={unreadCount ? 'has-unread' : ''}>
              {unreadCount ? `${unreadCount} جديد` : 'كلها مقروءة'}
            </span>
          </div>

          <div className="notification-popover__body">
            {menuLoading ? (
              <div className="notification-popover__loading" aria-live="polite">
                <span /><span /><span />
              </div>
            ) : menuError ? (
              <div className="notification-popover__state is-error">
                <strong>تعذر التحميل</strong>
                <button type="button" onClick={() => void loadMenu()}>إعادة المحاولة</button>
              </div>
            ) : items.length ? (
              <div className="notification-popover__list">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    className={`notification-popover__item${item.readAt ? ' is-read' : ' is-unread'}`}
                    onClick={() => void openNotification(item)}
                    disabled={savingId === item.id}
                  >
                    <span className={`notification-popover__icon type-${item.type}`} aria-hidden="true">{iconFor(item.type)}</span>
                    <span className="notification-popover__copy">
                      <span>
                        <strong>{item.title}</strong>
                        {!item.readAt ? <i>جديد</i> : null}
                      </span>
                      <small>{item.message}</small>
                      <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                    </span>
                    <span className="notification-popover__arrow" aria-hidden="true">←</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="notification-popover__state">
                <span aria-hidden="true">✓</span>
                <strong>لا توجد إشعارات جديدة</strong>
                <small>ستظهر هنا تحديثات طلباتك ومراجعاتك فورًا.</small>
              </div>
            )}
          </div>

          <Link href="/account#notifications" className="notification-popover__footer" onClick={() => setOpen(false)}>
            <span>عرض كل الإشعارات</span>
            <b aria-hidden="true">←</b>
          </Link>
        </div>
      ) : null}
    </div>
  );
}