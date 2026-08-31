'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string;
  entityType: string;
  entityId: string;
  readAt: string | null;
  createdAt: string;
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
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

export function NotificationCenter() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');

  const unreadCount = useMemo(() => items.filter((item) => !item.readAt).length, [items]);

  const broadcast = useCallback((nextItems: NotificationItem[]) => {
    const count = nextItems.filter((item) => !item.readAt).length;
    window.dispatchEvent(new CustomEvent('notifications:changed', { detail: { unreadCount: count } }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/notifications?limit=50', { cache: 'no-store', credentials: 'same-origin' });
      if (response.status === 401) return;
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'تعذر تحميل الإشعارات.');
      const nextItems = payload.notifications || [];
      setItems(nextItems);
      window.dispatchEvent(new CustomEvent('notifications:changed', { detail: { unreadCount: Number(payload.unreadCount || 0) } }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل الإشعارات.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(item: NotificationItem, navigate = true) {
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
        const now = new Date().toISOString();
        const nextItems = items.map((current) => current.id === item.id ? { ...current, readAt: now } : current);
        setItems(nextItems);
        broadcast(nextItems);
      } catch {
        setError('تعذر تحديث الإشعار الآن.');
        setSavingId('');
        return;
      }
      setSavingId('');
    }
    if (navigate) router.push(item.href || '/account');
  }

  async function markAllRead() {
    if (!unreadCount || savingId) return;
    setSavingId('all');
    setError('');
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'read_all' }),
      });
      if (!response.ok) throw new Error('READ_ALL_FAILED');
      const now = new Date().toISOString();
      const nextItems = items.map((item) => item.readAt ? item : { ...item, readAt: now });
      setItems(nextItems);
      broadcast(nextItems);
    } catch {
      setError('تعذر تحديد الإشعارات كمقروءة الآن.');
    } finally {
      setSavingId('');
    }
  }

  return (
    <section id="notifications" className="notification-center" aria-labelledby="notifications-title">
      <div className="notification-center__heading">
        <div>
          <span>مركز المتابعة</span>
          <h2 id="notifications-title">الإشعارات</h2>
          <p>نتائج مراجعة طلباتك وملكياتك وتعديلات أنشطتك وبلاغات البيانات تظهر هنا تلقائيًا.</p>
        </div>
        <div className="notification-center__actions">
          <span>{loading ? '...' : unreadCount ? `${unreadCount} غير مقروء` : 'كلها مقروءة'}</span>
          <button type="button" onClick={markAllRead} disabled={!unreadCount || Boolean(savingId)}>
            {savingId === 'all' ? 'جارٍ التحديث…' : 'تحديد الكل كمقروء'}
          </button>
        </div>
      </div>

      {error && <div className="notification-center__error" role="alert">{error}</div>}

      {loading ? (
        <div className="notification-center__empty">جارٍ تحميل الإشعارات…</div>
      ) : items.length ? (
        <div className="notification-list">
          {items.map((item) => (
            <article key={item.id} className={`notification-item${item.readAt ? ' is-read' : ' is-unread'}`}>
              <button type="button" className="notification-item__main" onClick={() => markRead(item)} disabled={savingId === item.id}>
                <span className={`notification-item__icon type-${item.type}`} aria-hidden="true">{iconFor(item.type)}</span>
                <span className="notification-item__copy">
                  <span className="notification-item__topline">
                    <strong>{item.title}</strong>
                    {!item.readAt && <i>جديد</i>}
                  </span>
                  <span className="notification-item__message">{item.message}</span>
                  <small>{formatDate(item.createdAt)}</small>
                </span>
                <span className="notification-item__arrow" aria-hidden="true">←</span>
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="notification-center__empty">
          <strong>لا توجد إشعارات حتى الآن</strong>
          <p>عند مراجعة أي طلب أو مطالبة أو تعديل أو بلاغ بيانات ستظهر النتيجة هنا تلقائيًا.</p>
        </div>
      )}
    </section>
  );
}
