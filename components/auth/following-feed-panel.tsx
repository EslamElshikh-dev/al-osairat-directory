'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CommunityActivityFeed } from '@/components/community-activity-feed';
import type { CommunityActivityItem } from '@/lib/community-activity';

type Payload = {
  authenticated: boolean;
  followingCount: number;
  items: CommunityActivityItem[];
  error?: string;
};

export function FollowingFeedPanel() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/community-following-feed?limit=36', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = await response.json().catch(() => ({})) as Payload;
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل Feed المتابعة.');
      setPayload(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل Feed المتابعة.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="account-community-feed" aria-labelledby="following-feed-title">
      <div className="account-community-section-heading">
        <div>
          <span>Community V2.4</span>
          <h2 id="following-feed-title">أتابعهم</h2>
          <p>أحدث التقييمات والردود المنشورة من الأعضاء الذين اخترت متابعتهم، مع احترام إعدادات الظهور العام لكل عضو.</p>
        </div>
        <div className="account-community-section-heading__actions">
          <span>{loading ? '…' : String(payload?.followingCount || 0) + ' تتابعهم'}</span>
          <button type="button" onClick={() => void load()} disabled={loading}>{loading ? 'جارٍ التحديث…' : 'تحديث'}</button>
        </div>
      </div>

      {error ? <div className="account-community-error" role="alert">{error}</div> : null}

      {loading && !payload ? (
        <div className="account-community-loading">جارٍ تحميل نشاط من تتابعهم…</div>
      ) : payload?.followingCount === 0 ? (
        <div className="account-community-empty">
          <span aria-hidden="true">＋</span>
          <strong>لم تتابع أي عضو بعد</strong>
          <p>استكشف أعضاء المجتمع وتابع من تهمك مساهماته، ثم سيظهر نشاطهم هنا تلقائيًا.</p>
          <Link href="/members">استكشف الأعضاء ←</Link>
        </div>
      ) : payload?.items.length ? (
        <CommunityActivityFeed items={payload.items} followingMode />
      ) : (
        <div className="account-community-empty">
          <span aria-hidden="true">✦</span>
          <strong>لا يوجد نشاط عام جديد ممن تتابعهم</strong>
          <p>قد تكون صفحات بعض من تتابعهم خاصة الآن، أو لم ينشروا مساهمات حديثة بعد.</p>
          <Link href="/community">استكشف نبض المجتمع ←</Link>
        </div>
      )}
    </section>
  );
}
