'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type SavedItem = {
  id: string;
  targetType: 'review' | 'reply';
  targetId: string;
  reviewId: string;
  authorName: string;
  body: string;
  rating: number | null;
  contextLabel: string;
  href: string;
  contributionCreatedAt: string;
  savedAt: string;
};

type WatchedThread = {
  id: string;
  reviewId: string;
  authorName: string;
  body: string;
  rating: number;
  contextLabel: string;
  href: string;
  continueHref: string;
  firstUnreadHref: string;
  contributionCreatedAt: string;
  watchedAt: string;
  lastSeenAt: string;
  lastSeenReplyId: string | null;
  notificationsMuted: boolean;
  latestReplyAt: string | null;
  replyCount: number;
  helpfulCount: number;
  newReplyCount: number;
};

type Payload = {
  authenticated: boolean;
  emailVerified: boolean;
  savedItems: SavedItem[];
  watchedThreads: WatchedThread[];
  watchedNewReplyCount: number;
  error?: string;
};

type Tab = 'saved' | 'watched';
type DiscussionSort = 'latest' | 'replies' | 'helpful';

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function Stars({ value }: { value: number }) {
  return (
    <span className="community-library-stars" aria-label={value + ' من 5 نجوم'}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < Math.round(value) ? 'is-filled' : ''} aria-hidden="true">★</span>
      ))}
    </span>
  );
}

export function CommunityLibraryPanel() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [tab, setTab] = useState<Tab>('saved');
  const [discussionSort, setDiscussionSort] = useState<DiscussionSort>('latest');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/community-library', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = await response.json().catch(() => ({})) as Payload;
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل محفوظات المجتمع.');
      setPayload(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل محفوظات المجتمع.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const refresh = () => { void load(true); };
    window.addEventListener('community:library-changed', refresh);
    return () => window.removeEventListener('community:library-changed', refresh);
  }, [load]);

  async function mutate(
    action: 'unsave' | 'unwatch' | 'mute' | 'unmute',
    targetType: 'review' | 'reply',
    targetId: string,
  ) {
    const key = action + ':' + targetId;
    if (savingKey) return;
    setSavingKey(key);
    setError('');
    try {
      const response = await fetch('/api/community-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action, targetType, targetId }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'تعذر تحديث محفوظات المجتمع.');
      await load(true);
      window.dispatchEvent(new CustomEvent('community:library-changed', {
        detail: { targetType, targetId },
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحديث محفوظات المجتمع.');
    } finally {
      setSavingKey('');
    }
  }

  async function markAllSeen() {
    if (bulkSaving || !watchedNewReplyCount) return;
    setBulkSaving(true);
    setError('');
    try {
      const response = await fetch('/api/community-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'mark_all_seen' }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'تعذر تحديث حالة النقاشات.');
      await load(true);
      window.dispatchEvent(new CustomEvent('community:library-changed', {
        detail: { readStateChanged: true, allSeen: true },
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحديث حالة النقاشات.');
    } finally {
      setBulkSaving(false);
    }
  }

  const savedCount = payload?.savedItems.length || 0;
  const watchedCount = payload?.watchedThreads.length || 0;
  const watchedNewReplyCount = payload?.watchedNewReplyCount
    ?? (payload?.watchedThreads || []).reduce((sum, item) => sum + item.newReplyCount, 0);
  const sortedWatched = useMemo(() => {
    const items = [...(payload?.watchedThreads || [])]
      .filter((item) => !onlyUnread || item.newReplyCount > 0);
    return items.sort((a, b) => {
      if (discussionSort === 'replies') {
        return b.replyCount - a.replyCount
          || Date.parse(b.latestReplyAt || b.contributionCreatedAt)
          - Date.parse(a.latestReplyAt || a.contributionCreatedAt);
      }
      if (discussionSort === 'helpful') {
        return b.helpfulCount - a.helpfulCount
          || b.replyCount - a.replyCount
          || Date.parse(b.latestReplyAt || b.contributionCreatedAt)
          - Date.parse(a.latestReplyAt || a.contributionCreatedAt);
      }
      return Date.parse(b.latestReplyAt || b.contributionCreatedAt)
        - Date.parse(a.latestReplyAt || a.contributionCreatedAt);
    });
  }, [discussionSort, onlyUnread, payload]);
  const activeItems = tab === 'saved' ? (payload?.savedItems || []) : sortedWatched;

  return (
    <section className="account-community-library" aria-labelledby="community-library-title">
      <div className="account-community-section-heading">
        <div>
          <span>Community V2.8</span>
          <h2 id="community-library-title">محفوظات المجتمع</h2>
          <p>احتفظ بالتقييمات والردود المهمة، وتابع النقاشات التي تريد الرجوع لها. كل هذه الاختيارات خاصة بحسابك فقط.</p>
        </div>
        <div className="account-community-section-heading__actions">
          <span>{loading ? '…' : (savedCount + watchedCount).toLocaleString('ar-EG') + ' عنصر'}</span>
          {watchedNewReplyCount > 0 ? (
            <span className="community-inbox-unread-total">
              {watchedNewReplyCount.toLocaleString('ar-EG')} رد جديد
            </span>
          ) : null}
          <button type="button" onClick={() => void load()} disabled={loading}>
            {loading ? 'جارٍ التحديث…' : 'تحديث'}
          </button>
        </div>
      </div>

      <div className="community-library-tabs" role="tablist" aria-label="محفوظات المجتمع">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'saved'}
          className={tab === 'saved' ? 'is-active' : ''}
          onClick={() => setTab('saved')}
        >
          المحفوظات <b>{savedCount.toLocaleString('ar-EG')}</b>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'watched'}
          className={tab === 'watched' ? 'is-active' : ''}
          onClick={() => setTab('watched')}
        >
          نقاشات أتابعها <b>{watchedCount.toLocaleString('ar-EG')}</b>
          {watchedNewReplyCount > 0 ? (
            <em>{watchedNewReplyCount.toLocaleString('ar-EG')} جديد</em>
          ) : null}
        </button>
      </div>

      {tab === 'watched' && watchedCount > 0 ? (
        <div className="community-thread-sort" aria-label="ترتيب النقاشات المتابعة">
          <span>رتّب حسب</span>
          <button
            type="button"
            className={discussionSort === 'latest' ? 'is-active' : ''}
            onClick={() => setDiscussionSort('latest')}
          >
            الأحدث
          </button>
          <button
            type="button"
            className={discussionSort === 'replies' ? 'is-active' : ''}
            onClick={() => setDiscussionSort('replies')}
          >
            الأكثر ردودًا
          </button>
          <button
            type="button"
            className={discussionSort === 'helpful' ? 'is-active' : ''}
            onClick={() => setDiscussionSort('helpful')}
          >
            الأكثر فائدة
          </button>
          <span className="community-thread-sort__divider" aria-hidden="true" />
          <button
            type="button"
            className={onlyUnread ? 'is-active is-unread' : ''}
            onClick={() => setOnlyUnread((value) => !value)}
            aria-pressed={onlyUnread}
          >
            غير المقروء فقط
          </button>
          {watchedNewReplyCount > 0 ? (
            <button
              type="button"
              className="community-thread-sort__mark-all"
              onClick={() => void markAllSeen()}
              disabled={bulkSaving}
            >
              {bulkSaving ? 'جارٍ التحديث…' : 'اعتبار الكل مقروء'}
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? <div className="account-community-error" role="alert">{error}</div> : null}

      {loading && !payload ? (
        <div className="account-community-loading">جارٍ تحميل محفوظات المجتمع…</div>
      ) : activeItems.length ? (
        <div className="community-library-list">
          {tab === 'saved'
            ? (payload?.savedItems || []).map((item) => (
              <article key={item.id} className="community-library-card">
                <header>
                  <div>
                    <span>{item.targetType === 'review' ? 'تقييم محفوظ' : 'رد محفوظ'}</span>
                    <Link href={item.href}>{item.contextLabel}</Link>
                  </div>
                  <time dateTime={item.savedAt}>حُفظ {formatDate(item.savedAt)}</time>
                </header>
                <div className="community-library-card__author">
                  <strong>{item.authorName}</strong>
                  {item.rating ? <Stars value={item.rating} /> : null}
                </div>
                <p>{item.body}</p>
                <footer>
                  <Link href={item.href}>فتح المساهمة ←</Link>
                  <button
                    type="button"
                    onClick={() => void mutate('unsave', item.targetType, item.targetId)}
                    disabled={Boolean(savingKey)}
                  >
                    {savingKey === 'unsave:' + item.targetId ? 'جارٍ الإزالة…' : 'إزالة من المحفوظات'}
                  </button>
                </footer>
              </article>
            ))
            : sortedWatched.map((item) => (
              <article key={item.id} className={'community-library-card is-watched' + (item.newReplyCount ? ' has-new' : '')}>
                <header>
                  <div>
                    <span>نقاش تتابعه</span>
                    <Link href={item.href}>{item.contextLabel}</Link>
                  </div>
                  <div className="community-thread-card__status">
                    {item.newReplyCount > 0 ? (
                      <b>{item.newReplyCount.toLocaleString('ar-EG')} رد جديد</b>
                    ) : null}
                    <time dateTime={item.latestReplyAt || item.watchedAt}>
                      {item.latestReplyAt ? 'آخر رد ' + formatDate(item.latestReplyAt) : 'منذ ' + formatDate(item.watchedAt)}
                    </time>
                  </div>
                </header>
                <div className="community-library-card__author">
                  <strong>{item.authorName}</strong>
                  <Stars value={item.rating} />
                </div>
                <p>{item.body}</p>
                <div className="community-thread-stats" aria-label="إحصاءات النقاش">
                  <span><b>{item.replyCount.toLocaleString('ar-EG')}</b> رد</span>
                  <span><b>{item.helpfulCount.toLocaleString('ar-EG')}</b> مفيد</span>
                  {item.newReplyCount > 0 ? (
                    <span className="is-new"><b>{item.newReplyCount.toLocaleString('ar-EG')}</b> غير مقروء</span>
                  ) : (
                    <span className="is-read">✓ محدث حتى آخر قراءة</span>
                  )}
                </div>
                <footer className="community-thread-card__footer">
                  <Link href={item.newReplyCount > 0 ? item.firstUnreadHref : item.continueHref}>
                    {item.newReplyCount > 0
                      ? 'اذهب لأول رد جديد ←'
                      : item.lastSeenReplyId
                        ? 'أكمل من آخر رد شفته ←'
                        : 'فتح النقاش ←'}
                  </Link>
                  <div>
                    <button
                      type="button"
                      className={item.notificationsMuted ? 'is-muted' : ''}
                      onClick={() => void mutate(
                        item.notificationsMuted ? 'unmute' : 'mute',
                        'review',
                        item.reviewId,
                      )}
                      disabled={Boolean(savingKey)}
                      title={item.notificationsMuted ? 'إعادة إشعارات هذا النقاش' : 'كتم إشعارات هذا النقاش'}
                    >
                      {savingKey === (item.notificationsMuted ? 'unmute:' : 'mute:') + item.reviewId
                        ? 'جارٍ التحديث…'
                        : item.notificationsMuted ? '🔕 مكتوم' : '🔔 الإشعارات'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void mutate('unwatch', 'review', item.reviewId)}
                      disabled={Boolean(savingKey)}
                    >
                      {savingKey === 'unwatch:' + item.reviewId ? 'جارٍ الإلغاء…' : 'إيقاف المتابعة'}
                    </button>
                  </div>
                </footer>
              </article>
            ))}
        </div>
      ) : (
        <div className="account-community-empty">
          <span aria-hidden="true">{tab === 'saved' ? '☆' : '◎'}</span>
          <strong>
            {tab === 'saved'
              ? 'لا توجد مساهمات محفوظة بعد'
              : onlyUnread && watchedCount > 0
                ? 'ممتاز — مفيش ردود جديدة غير مقروءة'
                : 'لا تتابع أي نقاش حتى الآن'}
          </strong>
          <p>
            {tab === 'saved'
              ? 'اضغط «حفظ» بجوار أي تقييم أو رد مهم، وهتلاقيه هنا فورًا.'
              : onlyUnread && watchedCount > 0
                ? 'كل النقاشات التي تتابعها وصلت عندك لآخر موضع قراءة.'
                : 'اضغط «متابعة النقاش» على أي تقييم تريد معرفة الردود الجديدة عليه.'}
          </p>
          <Link href="/community">استكشف نبض المجتمع ←</Link>
        </div>
      )}
    </section>
  );
}
