'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CommunityActivityItem } from '@/lib/community-activity';

type Filter = 'all' | 'review' | 'reply';

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

export function CommunityActivityFeed({ items }: { items: CommunityActivityItem[] }) {
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(
    () => filter === 'all' ? items : items.filter((item) => item.kind === filter),
    [filter, items],
  );

  const reviewCount = items.filter((item) => item.kind === 'review').length;
  const replyCount = items.length - reviewCount;

  return (
    <div className="community-activity-explorer">
      <div className="community-activity-tabs" role="tablist" aria-label="نوع مساهمات المجتمع">
        <button type="button" role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>
          الكل <b>{items.length.toLocaleString('ar-EG')}</b>
        </button>
        <button type="button" role="tab" aria-selected={filter === 'review'} className={filter === 'review' ? 'is-active' : ''} onClick={() => setFilter('review')}>
          التقييمات <b>{reviewCount.toLocaleString('ar-EG')}</b>
        </button>
        <button type="button" role="tab" aria-selected={filter === 'reply'} className={filter === 'reply' ? 'is-active' : ''} onClick={() => setFilter('reply')}>
          الردود <b>{replyCount.toLocaleString('ar-EG')}</b>
        </button>
      </div>

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
          <span aria-hidden="true">✦</span>
          <strong>لا توجد مساهمات في هذا العرض</strong>
          <p>غيّر نوع المساهمات أو عد لاحقًا بعد مشاركة أعضاء المجتمع.</p>
        </div>
      )}
    </div>
  );
}
