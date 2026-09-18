'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type ProgressMetric = {
  current: number;
  target: number;
  percent: number;
};

type HistoryItem = {
  id: string;
  kind: 'review' | 'reply';
  body: string;
  status: string;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  contextLabel: string;
  href: string;
};

type Payload = {
  authenticated: boolean;
  profile: {
    displayName: string;
    slug: string;
    isPublic: boolean;
  };
  summary: {
    reviewCount: number;
    replyCount: number;
    contributionCount: number;
    likeReceived: number;
    helpfulReceived: number;
    helpfulPeople: number;
  };
  badges: {
    active: {
      unlocked: boolean;
      label: string;
      contributionCurrent: number;
      contributionTarget: number;
      percent: number;
    };
    trusted: {
      unlocked: boolean;
      label: string;
      contributions: ProgressMetric;
      helpful: ProgressMetric;
      people: ProgressMetric;
    };
  };
  history: HistoryItem[];
  error?: string;
};

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

function statusLabel(status: string) {
  if (status === 'published') return 'منشور';
  if (status === 'hidden') return 'مخفي بعد المراجعة';
  return status;
}

function ProgressBar({
  label,
  current,
  target,
  percent,
}: {
  label: string;
  current: number;
  target: number;
  percent: number;
}) {
  return (
    <div className="community-progress-bar">
      <div>
        <span>{label}</span>
        <b>{Math.min(current, target).toLocaleString('ar-EG')} / {target.toLocaleString('ar-EG')}</b>
      </div>
      <span className="community-progress-bar__track" aria-label={label + ' ' + percent + '%'}>
        <i style={{ width: String(percent) + '%' }} />
      </span>
    </div>
  );
}

export function CommunityProgressPanel() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/community-progress', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = await response.json().catch(() => ({})) as Payload;
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل تقدم المجتمع.');
      setPayload(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل تقدم المجتمع.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="account-community-progress" aria-labelledby="community-progress-title">
      <div className="account-community-section-heading">
        <div>
          <span>سجل المجتمع</span>
          <h2 id="community-progress-title">مساهماتك وتقدم الشارات</h2>
          <p>ترى هنا تقدمك حتى لو كانت صفحتك العامة مغلقة. الظهور للآخرين يظل مرتبطًا باختيارك داخل إعدادات الملف.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}>{loading ? 'جارٍ التحديث…' : 'تحديث'}</button>
      </div>

      {error ? <div className="account-community-error" role="alert">{error}</div> : null}

      {loading && !payload ? (
        <div className="account-community-loading">جارٍ حساب مساهماتك…</div>
      ) : payload ? (
        <>
          <div className="community-progress-summary">
            <article><span>المساهمات</span><b>{payload.summary.contributionCount.toLocaleString('ar-EG')}</b><small>{payload.summary.reviewCount} تقييم · {payload.summary.replyCount} رد</small></article>
            <article><span>مفيد</span><b>{payload.summary.helpfulReceived.toLocaleString('ar-EG')}</b><small>من {payload.summary.helpfulPeople.toLocaleString('ar-EG')} أعضاء مختلفين</small></article>
            <article><span>إعجابات</span><b>{payload.summary.likeReceived.toLocaleString('ar-EG')}</b><small>على تقييماتك وردودك</small></article>
          </div>

          <div className="community-progress-badges">
            <article className={payload.badges.active.unlocked ? 'is-unlocked' : ''}>
              <header>
                <span className="community-badge is-active">عضو نشط</span>
                <b>{payload.badges.active.unlocked ? '✓ مكتسبة' : String(payload.badges.active.percent) + '%'}</b>
              </header>
              <p>تُكتسب بعد 3 مساهمات عامة منشورة.</p>
              <ProgressBar
                label="المساهمات"
                current={payload.badges.active.contributionCurrent}
                target={payload.badges.active.contributionTarget}
                percent={payload.badges.active.percent}
              />
            </article>

            <article className={payload.badges.trusted.unlocked ? 'is-unlocked' : ''}>
              <header>
                <span className="community-badge is-trusted">مساهم موثوق</span>
                <b>{payload.badges.trusted.unlocked ? '✓ مكتسبة' : 'قيد التقدم'}</b>
              </header>
              <p>شارة جودة مساهمة وليست توثيق هوية. تحتاج كل الشروط الثلاثة.</p>
              <ProgressBar label="المساهمات" {...payload.badges.trusted.contributions} />
              <ProgressBar label="إشارات مفيد" {...payload.badges.trusted.helpful} />
              <ProgressBar label="أعضاء مختلفون" {...payload.badges.trusted.people} />
            </article>
          </div>

          {!payload.profile.isPublic ? (
            <div className="community-progress-private-note">
              <span aria-hidden="true">◉</span>
              <div>
                <strong>صفحتك العامة غير مفعّلة</strong>
                <p>تقدمك محفوظ لك، لكن اسمك ومساهماتك لن تظهر في دليل الأعضاء أو نبض المجتمع حتى تختار تفعيل الصفحة العامة.</p>
              </div>
              <a href="#account-profile">إدارة الظهور</a>
            </div>
          ) : payload.profile.slug ? (
            <div className="community-progress-public-link">
              <span>صفحتك العامة مفعّلة</span>
              <Link href={'/members/' + payload.profile.slug}>فتح صفحتي ←</Link>
            </div>
          ) : null}

          <div className="community-history-heading">
            <div><span>السجل</span><h3>آخر مساهماتك</h3></div>
            <span>{payload.history.length.toLocaleString('ar-EG')} عنصر</span>
          </div>

          {payload.history.length ? (
            <div className="community-history-list">
              {payload.history.map((item) => (
                <article key={item.kind + ':' + item.id}>
                  <header>
                    <div>
                      <span>{item.kind === 'review' ? 'تقييم' : 'رد'}</span>
                      <Link href={item.href}>{item.contextLabel}</Link>
                    </div>
                    <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                  </header>
                  <p>{item.body}</p>
                  <footer>
                    <span>{statusLabel(item.status)}</span>
                    <Link href={item.href}>عرض السياق ←</Link>
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <div className="account-community-empty">
              <span aria-hidden="true">✦</span>
              <strong>لا توجد مساهمات بعد</strong>
              <p>ابدأ بتقييم الدليل أو المشاركة في نقاش، وسيظهر تقدمك هنا تلقائيًا.</p>
              <Link href="/community">استكشف المجتمع ←</Link>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
