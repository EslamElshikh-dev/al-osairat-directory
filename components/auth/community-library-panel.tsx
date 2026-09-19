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
  contributionCreatedAt: string;
  watchedAt: string;
};

type Payload = {
  authenticated: boolean;
  emailVerified: boolean;
  savedItems: SavedItem[];
  watchedThreads: WatchedThread[];
  error?: string;
};

type Tab = 'saved' | 'watched';

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
  const [loading, setLoading] = useState(true);
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
    action: 'unsave' | 'unwatch',
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

  const savedCount = payload?.savedItems.length || 0;
  const watchedCount = payload?.watchedThreads.length || 0;
  const activeItems = useMemo(
    () => tab === 'saved' ? (payload?.savedItems || []) : (payload?.watchedThreads || []),
    [payload, tab],
  );

  return (
    <section className="account-community-library" aria-labelledby="community-library-title">
      <div className="account-community-section-heading">
        <div>
          <span>Community V2.6</span>
          <h2 id="community-library-title">محفوظات المجتمع</h2>
          <p>احتفظ بالتقييمات والردود المهمة، وتابع النقاشات التي تريد الرجوع لها. كل هذه الاختيارات خاصة بحسابك فقط.</p>
        </div>
        <div className="account-community-section-heading__actions">
          <span>{loading ? '…' : (savedCount + watchedCount).toLocaleString('ar-EG') + ' عنصر'}</span>
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
        </button>
      </div>

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
            : (payload?.watchedThreads || []).map((item) => (
              <article key={item.id} className="community-library-card is-watched">
                <header>
                  <div>
                    <span>نقاش تتابعه</span>
                    <Link href={item.href}>{item.contextLabel}</Link>
                  </div>
                  <time dateTime={item.watchedAt}>منذ {formatDate(item.watchedAt)}</time>
                </header>
                <div className="community-library-card__author">
                  <strong>{item.authorName}</strong>
                  <Stars value={item.rating} />
                </div>
                <p>{item.body}</p>
                <footer>
                  <Link href={item.href}>فتح النقاش ←</Link>
                  <button
                    type="button"
                    onClick={() => void mutate('unwatch', 'review', item.reviewId)}
                    disabled={Boolean(savingKey)}
                  >
                    {savingKey === 'unwatch:' + item.reviewId ? 'جارٍ الإلغاء…' : 'إيقاف المتابعة'}
                  </button>
                </footer>
              </article>
            ))}
        </div>
      ) : (
        <div className="account-community-empty">
          <span aria-hidden="true">{tab === 'saved' ? '☆' : '◎'}</span>
          <strong>{tab === 'saved' ? 'لا توجد مساهمات محفوظة بعد' : 'لا تتابع أي نقاش حتى الآن'}</strong>
          <p>
            {tab === 'saved'
              ? 'اضغط «حفظ» بجوار أي تقييم أو رد مهم، وهتلاقيه هنا فورًا.'
              : 'اضغط «متابعة النقاش» على أي تقييم تريد معرفة الردود الجديدة عليه.'}
          </p>
          <Link href="/community">استكشف نبض المجتمع ←</Link>
        </div>
      )}
    </section>
  );
}
