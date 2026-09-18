'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CommunityActivityItem } from '@/lib/community-activity';

type Filter = 'all' | 'helpful' | 'review' | 'reply';

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

function Stars({ value }: { value: number }) {
  return (
    <span className="community-activity-stars" aria-label={value + ' من 5 نجوم'}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < Math.round(value) ? 'is-filled' : ''} aria-hidden="true">★</span>
      ))}
    </span>
  );
}

export function CommunityActivityFeed({
  items,
  followingMode = false,
}: {
  items: CommunityActivityItem[];
  followingMode?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    if (filter === 'review' || filter === 'reply') {
      return items.filter((item) => item.kind === filter);
    }
    if (filter === 'helpful') {
      return items
        .filter((item) => item.weeklyHelpfulCount > 0)
        .sort((a, b) =>
          b.weeklyHelpfulCount - a.weeklyHelpfulCount
          || b.reactions.helpfulCount - a.reactions.helpfulCount
          || Date.parse(b.createdAt) - Date.parse(a.createdAt),
        );
    }
    return items;
  }, [filter, items]);

  const reviewCount = items.filter((item) => item.kind === 'review').length;
  const replyCount = items.length - reviewCount;
  const weeklyHelpfulItems = items.filter((item) => item.weeklyHelpfulCount > 0).length;

  return (
    <div className={'community-activity-explorer' + (followingMode ? ' is-following-feed' : '')}>
      <div className="community-activity-tabs" role="tablist" aria-label="عرض مساهمات المجتمع">
        <button type="button" role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>
          {followingMode ? 'الأحدث ممن أتابعهم' : 'الأحدث'} <b>{items.length.toLocaleString('ar-EG')}</b>
        </button>
        <button type="button" role="tab" aria-selected={filter === 'helpful'} className={filter === 'helpful' ? 'is-active' : ''} onClick={() => setFilter('helpful')}>
          الأكثر فائدة هذا الأسبوع <b>{weeklyHelpfulItems.toLocaleString('ar-EG')}</b>
        </button>
        <button type="button" role="tab" aria-selected={filter === 'review'} className={filter === 'review' ? 'is-active' : ''} onClick={() => setFilter('review')}>
          التقييمات <b>{reviewCount.toLocaleString('ar-EG')}</b>
        </button>
        <button type="button" role="tab" aria-selected={filter === 'reply'} className={filter === 'reply' ? 'is-active' : ''} onClick={() => setFilter('reply')}>
          الردود <b>{replyCount.toLocaleString('ar-EG')}</b>
        </button>
      </div>

      {filter === 'helpful' ? (
        <p className="community-activity-tabs-note">
          الترتيب يعتمد على إشارات «مفيد» خلال آخر 7 أيام فقط، وليس على إجمالي التفاعل التاريخي.
        </p>
      ) : null}

      {visible.length ? (
        <div className="community-activity-list">
          {visible.map((item) => {
            const initial = item.author.displayName.trim().charAt(0) || 'ع';
            return (
              <article className={'community-activity-card is-' + item.kind} key={item.kind + ':' + item.id}>
                <header>
                  <Link href={'/members/' + item.author.slug} className="community-activity-author">
                    <span className={'community-activity-avatar' + (item.author.avatarUrl ? ' has-photo' : '')}>
                      {item.author.avatarUrl ? (
                        <img src={item.author.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      ) : <span aria-hidden="true">{initial}</span>}
                    </span>
                    <span>
                      <b>{item.author.displayName}</b>
                      <small>{item.author.location || 'عضو في مجتمع دليل العسيرات'}</small>
                    </span>
                  </Link>
                  <div className="community-activity-meta">
                    {item.weeklyHelpfulCount > 0 ? (
                      <span className="community-activity-weekly-helpful">
                        ✓ {item.weeklyHelpfulCount.toLocaleString('ar-EG')} مفيد هذا الأسبوع
                      </span>
                    ) : null}
                    <span>{item.kind === 'review' ? 'تقييم' : 'رد'}</span>
                    <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                  </div>
                </header>

                <div className="community-activity-context">
                  <span>{item.kind === 'review' ? 'قيّم' : 'شارك في نقاش حول'}</span>
                  <Link href={item.href}>{item.contextLabel}</Link>
                </div>

                {item.rating ? <Stars value={item.rating} /> : null}
                <p>{item.body}</p>

                <footer>
                  <div className="community-activity-signals" aria-label="تفاعلات المساهمة">
                    <span>♡ <b>{item.reactions.likeCount.toLocaleString('ar-EG')}</b></span>
                    <span>✓ مفيد <b>{item.reactions.helpfulCount.toLocaleString('ar-EG')}</b></span>
                  </div>
                  <Link href={item.href}>{item.kind === 'review' ? 'عرض التقييم' : 'عرض المناقشة'} ←</Link>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="community-members-empty community-activity-empty">
          <span aria-hidden="true">{filter === 'helpful' ? '✓' : '✦'}</span>
          <strong>{filter === 'helpful' ? 'لا توجد مساهمات حصلت على «مفيد» هذا الأسبوع' : 'لا توجد مساهمات في هذا العرض'}</strong>
          <p>{filter === 'helpful' ? 'ستظهر هنا المساهمات عندما تبدأ إشارات «مفيد» الجديدة خلال آخر 7 أيام.' : 'غيّر نوع المساهمات أو عد لاحقًا بعد مشاركة أعضاء المجتمع.'}</p>
        </div>
      )}
    </div>
  );
}
