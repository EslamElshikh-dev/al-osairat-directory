'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CommunityActivityFeed } from '@/components/community-activity-feed';
import { CommunityFollowButton } from '@/components/community-follow-button';
import type { CommunityActivityItem } from '@/lib/community-activity';
import type { PublicMemberDirectoryEntry } from '@/lib/community-profiles';

type Payload = {
  authenticated: boolean;
  followingCount: number;
  newCount: number;
  lastSeenAt: string | null;
  items: CommunityActivityItem[];
  suggestions: PublicMemberDirectoryEntry[];
  error?: string;
};

function MemberSuggestion({ member }: { member: PublicMemberDirectoryEntry }) {
  const initial = member.displayName.trim().charAt(0) || 'ع';
  const location = [member.locality, member.village].filter(Boolean).join(' · ');

  return (
    <article className="community-follow-suggestion">
      <Link href={'/members/' + member.slug} className="community-follow-suggestion__main">
        <span className={'community-follow-suggestion__avatar' + (member.avatarUrl ? ' has-photo' : '')}>
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
          ) : <span aria-hidden="true">{initial}</span>}
        </span>
        <span className="community-follow-suggestion__copy">
          <b>{member.displayName}</b>
          <small>{location || 'عضو في مجتمع دليل العسيرات'}</small>
          <span>
            {member.badges.slice(0, 2).map((badge) => (
              <em className={'community-badge is-' + badge.key} key={badge.key}>{badge.label}</em>
            ))}
          </span>
        </span>
      </Link>
      <div className="community-follow-suggestion__signals">
        <span><b>{member.contributionCount.toLocaleString('ar-EG')}</b> مساهمة</span>
        <span><b>{member.helpfulReceived.toLocaleString('ar-EG')}</b> مفيد</span>
      </div>
      <CommunityFollowButton slug={member.slug} initialFollowerCount={0} />
    </article>
  );
}

export function FollowingFeedPanel() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingSeen, setMarkingSeen] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
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
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const refresh = () => { void load(true); };
    window.addEventListener('community:follow-changed', refresh);
    return () => window.removeEventListener('community:follow-changed', refresh);
  }, [load]);

  async function markSeen() {
    if (!payload?.newCount || markingSeen) return;
    setMarkingSeen(true);
    setError('');
    try {
      const response = await fetch('/api/community-following-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'mark_seen' }),
      });
      const data = await response.json().catch(() => ({})) as {
        lastSeenAt?: string;
        newCount?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || 'تعذر تحديث Feed.');
      setPayload((current) => current ? {
        ...current,
        newCount: 0,
        lastSeenAt: data.lastSeenAt || new Date().toISOString(),
      } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحديث Feed.');
    } finally {
      setMarkingSeen(false);
    }
  }

  return (
    <section className="account-community-feed" aria-labelledby="following-feed-title">
      <div className="account-community-section-heading">
        <div>
          <span>Community V2.5</span>
          <h2 id="following-feed-title">أتابعهم</h2>
          <p>أحدث مساهمات من تتابعهم مع عدّاد حقيقي للجديد منذ آخر مشاهدة، بدون تتبع عام لسلوكك أو كشف قائمة متابعتك.</p>
        </div>
        <div className="account-community-section-heading__actions">
          <span>{loading ? '…' : String(payload?.followingCount || 0) + ' تتابعهم'}</span>
          {payload?.newCount ? (
            <span className="community-new-count">{payload.newCount.toLocaleString('ar-EG')} جديد</span>
          ) : null}
          {payload?.newCount ? (
            <button type="button" className="is-secondary" onClick={() => void markSeen()} disabled={markingSeen}>
              {markingSeen ? 'جارٍ التحديث…' : 'اعتبار الكل شوهد'}
            </button>
          ) : null}
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
          <p>اختر أول عضو من الاقتراحات بالأسفل، وسيبدأ Feed الشخصي في التكوّن تلقائيًا.</p>
          <Link href="/members">استكشف كل الأعضاء ←</Link>
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

      {payload?.suggestions?.length ? (
        <section className="community-follow-suggestions" aria-labelledby="community-follow-suggestions-title">
          <div className="community-follow-suggestions__heading">
            <div>
              <span>اكتشاف ذكي</span>
              <h3 id="community-follow-suggestions-title">أعضاء قد يهمك متابعتهم</h3>
              <p>الترشيح يعتمد فقط على النشاط العام وجودة المساهمات والشارات، وليس على بيانات شخصية مخفية.</p>
            </div>
            <Link href="/members">كل الأعضاء ←</Link>
          </div>
          <div className="community-follow-suggestions__grid">
            {payload.suggestions.map((member) => <MemberSuggestion member={member} key={member.slug} />)}
          </div>
        </section>
      ) : null}
    </section>
  );
}
