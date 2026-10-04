'use client';

import Link from 'next/link';
import { loadPublicUpdates, type PublicUpdate } from '@/lib/public-updates-client';
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
      timeZone: 'Africa/Cairo',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function iconFor(type: string) {
  if (type.startsWith('owner_')) return '+';
  if (type.includes('thread_update')) return '◎';
  if (type.includes('helpful_received')) return '✓';
  if (type.includes('review_reply')) return '↩';
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
  const acknowledgingRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [updates, setUpdates] = useState<PublicUpdate[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [updatesError, setUpdatesError] = useState('');
  const [updatesLoading, setUpdatesLoading] = useState(true);
  const loadUpdates = useCallback(async () => {
    try {
      const list = await loadPublicUpdates();
      setUpdates(list.filter((item) => item.href?.startsWith('/') && !item.href.startsWith('//') && !item.href.includes('\\')));
      setUpdatesError('');
    } catch { setUpdatesError('تعذر تحميل تحديثات الدليل.'); }
    finally { setUpdatesLoading(false); }
  }, []);
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem('osairat:public-updates:seen:v1') || '[]');
      if (Array.isArray(stored)) setSeen(stored.filter((id): id is string => typeof id === 'string').slice(-100));
    } catch { /* Read state is optional in private browsing. */ }
    const timer = window.setTimeout(() => { void loadUpdates(); }, 1200);
    const onVisible = () => { if (document.visibilityState === 'visible') void loadUpdates(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [loadUpdates]);

  function readPublicUpdate(id: string) {
    const next = [...new Set([...seen, id])].slice(-100);
    setSeen(next);
    try { localStorage.setItem('osairat:public-updates:seen:v1', JSON.stringify(next)); } catch {}
    setOpen(false);
  }
  const publicUnread = updates.filter((item) => !seen.includes(item.id) && Date.parse(item.publishedAt) >= Date.now() - 14 * 86400_000).length;
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [savingId, setSavingId] = useState('');
  const totalUnread = unreadCount + publicUnread;

  const load = useCallback(() => {
    if (document.visibilityState !== 'visible') return Promise.resolve();
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
        setUnreadCount(0);
        setItems([]);
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

  // A notification that has been rendered in the open panel is already seen.
  // Mark only the visible IDs, leaving later arrivals and older hidden rows new.
  useEffect(() => {
    if (!open || menuLoading || acknowledgingRef.current) return;
    const ids = items.filter((item) => !item.readAt).map((item) => item.id);
    if (!ids.length) return;
    acknowledgingRef.current = true;
    void fetch('/api/notifications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'read_many', ids }),
    }).then(async (response) => {
      if (!response.ok) throw new Error('READ_FAILED');
      const payload = await response.json();
      const readAt = payload.readAt || new Date().toISOString();
      setItems((current) => current.map((item) => ids.includes(item.id) ? { ...item, readAt } : item));
      setUnreadCount(Number(payload.unreadCount || 0));
      window.dispatchEvent(new CustomEvent('notifications:changed', { detail: { unreadCount: Number(payload.unreadCount || 0) } }));
    }).catch(() => setMenuError('تعذر حفظ الاطلاع على الإشعارات.')).finally(() => { acknowledgingRef.current = false; });
  }, [open, menuLoading, items]);

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
        setUnreadCount(0);
        setItems([]);
        return;
      }

      setVisible(true);
      void load();
      if (open) void loadMenu();
      if (timer === null) timer = window.setInterval(() => { void load(); if (open && document.visibilityState === 'visible') void loadMenu(); }, 15_000);
    };

    const unsubscribe = subscribeClientSession(syncForSession);
    void ensureClientSession();

    const handleChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ unreadCount?: number }>).detail;
      if (typeof detail?.unreadCount === 'number') setUnreadCount(detail.unreadCount);
      else void ensureClientSession().then((user) => { if (user) void load(); });
      if (open) void ensureClientSession().then((user) => { if (user) void loadMenu(); });
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

  const badge = totalUnread > 99 ? '99+' : String(totalUnread);

  function toggleMenu() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      void loadUpdates().then((list) => {
        const recentlyPublished = list.filter((item) => Date.parse(item.publishedAt) >= Date.now() - 14 * 86400_000).map((item) => item.id);
        const next = [...new Set([...seen, ...recentlyPublished])].slice(-100);
        setSeen(next);
        try { localStorage.setItem('osairat:public-updates:seen:v1', JSON.stringify(next)); } catch {}
      });
      if (visible) void loadMenu();
    }
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
        if (!response.ok) throw new Error('READ_FAILED');
        if (response.ok) {
          const payload = await response.json();
          const now = new Date().toISOString();
          setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: now } : entry));
          setUnreadCount(Number(payload.unreadCount || 0));
          window.dispatchEvent(new CustomEvent('notifications:changed', {
            detail: { unreadCount: Number(payload.unreadCount || 0) },
          }));
        }
      } catch {
        setMenuError('تعذر تحديث حالة الإشعار، حاول مرة أخرى.');
        return;
      } finally {
        setSavingId('');
      }
    }
    setOpen(false);
    router.push(item.href?.startsWith('/') && !item.href.startsWith('//') && !item.href.includes('\\') ? item.href : '/account#notifications');
  }

  return (
    <div className={`notification-popover${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className={`notification-bell${totalUnread ? ' has-unread' : ''}`}
        aria-label={totalUnread ? `الإشعارات، ${totalUnread} غير مقروءة` : 'الإشعارات'}
        aria-haspopup="dialog"
        aria-controls="osairat-notification-panel"
        aria-expanded={open}
        title="الإشعارات"
        onClick={toggleMenu}
      >
        <BellIcon />
        {totalUnread > 0 && <span>{badge}</span>}
      </button>

      {open ? (
        <div id="osairat-notification-panel" className="notification-popover__panel" role="dialog" aria-label="آخر الإشعارات">
          <div className="notification-popover__head">
            <div>
              <span>آخر التحديثات</span>
              <strong>الإشعارات</strong>
            </div>
            <button type="button" className="notification-popover__close" aria-label="إغلاق الإشعارات" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="notification-popover__body">
            <p className="notification-popover__welcome">اللهم صل وسلم وزد وبارك على سيدنا محمد، نورت الدليل 🤍.</p>
            {visible && <h3 className="notification-popover__section">تحديثات حسابك وطلباتك {unreadCount ? `(${unreadCount} غير مقروءة)` : ''}</h3>}
            {visible && (menuLoading ? (
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
                <small>ستظهر هنا تحديثات طلباتك والردود الجديدة على تقييماتك.</small>
              </div>
            ))}
            <h3 className="notification-popover__section">أحداث الدليل · أنشطة وأخبار وفرص</h3>
            {updatesLoading ? <p className="notification-popover__state">جارٍ تحميل التحديثات…</p> : updatesError ? <div className="notification-popover__state"><p>{updatesError}</p><button type="button" onClick={() => void loadUpdates()}>إعادة المحاولة</button></div> : updates.length ? <div className="notification-popover__list">
              {updates.map((item) => <Link prefetch={false} className={`notification-popover__item is-public${!seen.includes(item.id) && Date.parse(item.publishedAt) >= Date.now() - 14 * 86400_000 ? ' is-unread' : ' is-read'}`} href={item.href} key={item.id} onClick={() => readPublicUpdate(item.id)}>
                <span className="notification-popover__copy"><span><strong>{item.title}</strong>{!seen.includes(item.id) && Date.parse(item.publishedAt) >= Date.now() - 14 * 86400_000 ? <i>جديد</i> : null}</span><small>{item.summary}</small><time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time></span><span className="notification-popover__arrow" aria-hidden="true">←</span>
              </Link>)}
            </div> : <p className="notification-popover__state">لا توجد أحداث منشورة حديثًا.</p>}
          </div>

          <Link href={visible ? "/account#notifications" : "/news"} className="notification-popover__footer" onClick={() => setOpen(false)}>
            <span>{visible ? "عرض كل إشعارات حسابك" : "تصفح الأخبار"}</span>
            <b aria-hidden="true">←</b>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
