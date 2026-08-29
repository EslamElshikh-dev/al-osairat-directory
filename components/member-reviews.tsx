'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

type ReviewTargetType = 'site' | 'article';

type ReviewItem = {
  id: string;
  rating: number;
  body: string;
  authorName: string;
  avatarUrl: string;
  createdAt: string;
  updatedAt: string;
  own?: boolean;
};

type ReviewSummary = {
  count: number;
  average: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

type ReviewsPayload = {
  authenticated: boolean;
  emailVerified: boolean;
  summary: ReviewSummary;
  reviews: ReviewItem[];
  myReview: ReviewItem | null;
  nextOffset: number | null;
  pageSize: number;
  error?: string;
};

type MemberReviewsProps = {
  targetType: ReviewTargetType;
  targetKey: string;
  eyebrow: string;
  title: string;
  description: string;
  prompt: string;
  className?: string;
};

const REVIEW_MIN_LENGTH = 20;
const REVIEW_MAX_LENGTH = 1200;
const stars = [1, 2, 3, 4, 5] as const;
const distributionStars = [5, 4, 3, 2, 1] as const;

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

function RatingStars({ value, label }: { value: number; label?: string }) {
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className="member-rating-stars" aria-label={label || `${value.toFixed(1)} من 5 نجوم`}>
      <span className="member-rating-stars__base" aria-hidden="true">★★★★★</span>
      <span className="member-rating-stars__fill" aria-hidden="true" style={{ width: `${percent}%` }}>★★★★★</span>
    </span>
  );
}

function StarPicker({ value, onChange, disabled }: { value: number; onChange: (value: number) => void; disabled?: boolean }) {
  return (
    <div className="member-review-star-picker" role="group" aria-label="اختر عدد النجوم" dir="ltr">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          className={star <= value ? 'is-selected' : ''}
          aria-label={`${star} ${star === 1 ? 'نجمة' : 'نجوم'}`}
          aria-pressed={star === value}
          onClick={() => onChange(star)}
          disabled={disabled}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function Avatar({ review }: { review: ReviewItem }) {
  const initial = review.authorName.trim().charAt(0) || 'ع';
  return (
    <span className="member-review-avatar" aria-hidden="true">
      {review.avatarUrl ? (
        <img src={review.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <span>{initial}</span>
      )}
    </span>
  );
}

export function MemberReviews({
  targetType,
  targetKey,
  eyebrow,
  title,
  description,
  prompt,
  className = '',
}: MemberReviewsProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [activated, setActivated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [payload, setPayload] = useState<ReviewsPayload | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const endpoint = `/api/content-reviews?targetType=${encodeURIComponent(targetType)}&targetKey=${encodeURIComponent(targetKey)}`;

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const data = await response.json() as ReviewsPayload;
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل التقييمات.');
      setPayload(data);
      if (data.myReview) {
        setRating(data.myReview.rating);
        setReviewText(data.myReview.body);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل التقييمات.');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || activated) return;
    if (!('IntersectionObserver' in window)) {
      setActivated(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setActivated(true);
        observer.disconnect();
      }
    }, { rootMargin: '320px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [activated]);

  useEffect(() => {
    if (activated && !payload && !loading) void loadInitial();
  }, [activated, payload, loading, loadInitial]);

  async function loadMore() {
    if (!payload?.nextOffset || loadingMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const response = await fetch(`${endpoint}&offset=${payload.nextOffset}`, { cache: 'no-store' });
      const data = await response.json() as ReviewsPayload;
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل المزيد.');
      setPayload((current) => current ? {
        ...current,
        summary: data.summary,
        reviews: [...current.reviews, ...data.reviews.filter((item) => !current.reviews.some((existing) => existing.id === item.id))],
        nextOffset: data.nextOffset,
        myReview: data.myReview,
        authenticated: data.authenticated,
        emailVerified: data.emailVerified,
      } : data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل المزيد.');
    } finally {
      setLoadingMore(false);
    }
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setFeedback('');
    setError('');

    const cleanText = reviewText.trim();
    if (!rating) {
      setError('اختر عدد النجوم أولًا.');
      return;
    }
    if (cleanText.length < REVIEW_MIN_LENGTH || cleanText.length > REVIEW_MAX_LENGTH) {
      setError(`اكتب رأيك في ${REVIEW_MIN_LENGTH} إلى ${REVIEW_MAX_LENGTH} حرفًا.`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/content-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetKey, rating, review: cleanText }),
      });
      const data = await response.json() as { error?: string; updated?: boolean };
      if (!response.ok) throw new Error(data.error || 'تعذر حفظ تقييمك.');
      setFeedback(data.updated ? 'تم تحديث تقييمك بنجاح.' : 'تم نشر تقييمك بنجاح.');
      await loadInitial();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تعذر حفظ تقييمك.');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteReview() {
    if (!payload?.myReview || deleting) return;
    if (!window.confirm('هل تريد حذف تقييمك نهائيًا؟')) return;
    setDeleting(true);
    setFeedback('');
    setError('');
    try {
      const response = await fetch(endpoint, { method: 'DELETE' });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'تعذر حذف تقييمك.');
      setRating(0);
      setReviewText('');
      setFeedback('تم حذف تقييمك.');
      await loadInitial();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'تعذر حذف تقييمك.');
    } finally {
      setDeleting(false);
    }
  }

  const summary = payload?.summary || { count: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  const hasReviews = summary.count > 0;
  const cleanLength = reviewText.trim().length;
  const canSubmit = rating > 0 && cleanLength >= REVIEW_MIN_LENGTH && cleanLength <= REVIEW_MAX_LENGTH && !submitting;

  return (
    <section ref={sectionRef} className={`member-reviews ${className}`.trim()} aria-labelledby={`member-reviews-${targetType}-${targetKey}`}>
      <div className="member-reviews__heading">
        <div>
          <span className="member-reviews__eyebrow">{eyebrow}</span>
          <h2 id={`member-reviews-${targetType}-${targetKey}`}>{title}</h2>
          <p>{description}</p>
        </div>
        {hasReviews ? (
          <div className="member-reviews__headline-rating" aria-label={`متوسط التقييم ${summary.average.toFixed(1)} من 5 من ${summary.count} تقييم`}>
            <strong>{summary.average.toFixed(1)}</strong>
            <div>
              <RatingStars value={summary.average} />
              <span>{summary.count} {summary.count === 1 ? 'تقييم' : 'تقييمات'}</span>
            </div>
          </div>
        ) : null}
      </div>

      {!activated || loading ? (
        <div className="member-reviews__loading" aria-live="polite">
          <span /><span /><span />
        </div>
      ) : error && !payload ? (
        <div className="member-reviews__error" role="alert">
          <strong>تعذر تحميل التقييمات</strong>
          <p>{error}</p>
          <button type="button" onClick={() => void loadInitial()}>إعادة المحاولة</button>
        </div>
      ) : payload ? (
        <div className="member-reviews__layout">
          <div className="member-reviews__summary-column">
            <div className="member-review-summary-card">
              {hasReviews ? (
                <>
                  <div className="member-review-summary-card__score">
                    <strong>{summary.average.toFixed(1)}</strong>
                    <RatingStars value={summary.average} />
                    <span>بناءً على {summary.count} {summary.count === 1 ? 'تقييم من عضو' : 'تقييمات من الأعضاء'}</span>
                  </div>
                  <div className="member-review-distribution" aria-label="توزيع التقييمات">
                    {distributionStars.map((star) => {
                      const count = summary.distribution[star] || 0;
                      const percent = summary.count ? Math.round((count / summary.count) * 100) : 0;
                      return (
                        <div key={star} className="member-review-distribution__row">
                          <span>{star} ★</span>
                          <div><i style={{ width: `${percent}%` }} /></div>
                          <b>{count}</b>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="member-review-summary-card__empty">
                  <span aria-hidden="true">★★★★★</span>
                  <strong>كن أول من يشارك رأيه</strong>
                  <p>تقييمك يساعدنا على تحسين التجربة ويمنح بقية الأعضاء صورة أوضح.</p>
                </div>
              )}
            </div>

            <div className="member-review-form-card">
              {payload.authenticated ? (
                payload.emailVerified ? (
                  <form onSubmit={submitReview}>
                    <div className="member-review-form-card__head">
                      <div>
                        <span>{payload.myReview ? 'تقييمك الحالي' : 'شارك تجربتك'}</span>
                        <h3>{payload.myReview ? 'عدّل تقييمك في أي وقت' : prompt}</h3>
                      </div>
                      {payload.myReview ? <span className="member-review-form-card__saved">منشور</span> : null}
                    </div>

                    <label className="member-review-form-card__label">عدد النجوم</label>
                    <StarPicker value={rating} onChange={setRating} disabled={submitting || deleting} />

                    <label className="member-review-form-card__label" htmlFor={`review-text-${targetType}-${targetKey}`}>اكتب رأيك</label>
                    <textarea
                      id={`review-text-${targetType}-${targetKey}`}
                      value={reviewText}
                      onChange={(event) => setReviewText(event.target.value.slice(0, REVIEW_MAX_LENGTH))}
                      minLength={REVIEW_MIN_LENGTH}
                      maxLength={REVIEW_MAX_LENGTH}
                      placeholder="اكتب تجربة واضحة ومفيدة باختصار…"
                      disabled={submitting || deleting}
                      required
                    />
                    <div className="member-review-form-card__meta">
                      <span>رأي حقيقي من حساب عضو مسجل</span>
                      <span className={cleanLength > 0 && cleanLength < REVIEW_MIN_LENGTH ? 'is-warning' : ''}>{cleanLength}/{REVIEW_MAX_LENGTH}</span>
                    </div>

                    <div className="member-review-form-card__actions">
                      <button type="submit" className="member-review-submit" disabled={!canSubmit || deleting}>
                        {submitting ? 'جارٍ الحفظ…' : payload.myReview ? 'تحديث تقييمي' : 'نشر التقييم'}
                      </button>
                      {payload.myReview ? (
                        <button type="button" className="member-review-delete" onClick={deleteReview} disabled={submitting || deleting}>
                          {deleting ? 'جارٍ الحذف…' : 'حذف تقييمي'}
                        </button>
                      ) : null}
                    </div>
                  </form>
                ) : (
                  <div className="member-review-auth-note">
                    <span aria-hidden="true">✓</span>
                    <div><strong>أكد بريدك قبل التقييم</strong><p>نطلب بريدًا مؤكدًا للحفاظ على جودة تقييمات الأعضاء وتقليل الإساءة.</p></div>
                  </div>
                )
              ) : (
                <div className="member-review-auth-note member-review-auth-note--guest">
                  <span aria-hidden="true">★</span>
                  <div>
                    <strong>سجّل الدخول لتشارك تقييمك</strong>
                    <p>القراءة متاحة للجميع، والكتابة مخصصة للأعضاء المسجلين فقط.</p>
                    <div><Link href="/account/login">تسجيل الدخول</Link><Link href="/account/register">إنشاء حساب</Link></div>
                  </div>
                </div>
              )}
              <div className="member-review-feedback" aria-live="polite">
                {feedback ? <p className="is-success">{feedback}</p> : null}
                {error ? <p className="is-error">{error}</p> : null}
              </div>
            </div>
          </div>

          <div className="member-reviews__list-column">
            <div className="member-reviews__list-head">
              <div><span>آراء المجتمع</span><h3>ماذا يقول أعضاء دليل العسيرات؟</h3></div>
              {hasReviews ? <span>{summary.count} مشاركة</span> : null}
            </div>

            {payload.reviews.length ? (
              <div className="member-review-list">
                {payload.reviews.map((review) => (
                  <article key={review.id} className={`member-review-card${review.own ? ' is-own' : ''}`}>
                    <header>
                      <Avatar review={review} />
                      <div className="member-review-card__identity">
                        <div><strong>{review.authorName}</strong>{review.own ? <span>تقييمك</span> : <span>عضو مسجل</span>}</div>
                        <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
                      </div>
                      <RatingStars value={review.rating} label={`${review.rating} من 5 نجوم`} />
                    </header>
                    <p>{review.body}</p>
                    {review.updatedAt !== review.createdAt ? <small>تم تعديل التقييم</small> : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="member-review-list__empty">
                <span aria-hidden="true">✦</span>
                <strong>لا توجد تقييمات منشورة بعد</strong>
                <p>أول تقييم مفيد يفتح النقاش لبقية الأعضاء.</p>
              </div>
            )}

            {payload.nextOffset !== null ? (
              <button type="button" className="member-review-load-more" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'جارٍ التحميل…' : 'عرض المزيد من التقييمات'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
