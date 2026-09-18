'use client';

import Link from 'next/link';
import { useState } from 'react';

type ReplyItem = {
  id: string;
  body: string;
  authorName: string;
  avatarUrl: string;
  profileSlug: string;
  createdAt: string;
  updatedAt: string;
  own?: boolean;
};

type RepliesPayload = {
  authenticated: boolean;
  emailVerified: boolean;
  count: number;
  replies: ReplyItem[];
  myReply: ReplyItem | null;
  error?: string;
};

const REPLY_MAX_LENGTH = 600;

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

function ReplyAvatar({ reply }: { reply: ReplyItem }) {
  const initial = reply.authorName.trim().charAt(0) || 'ع';
  const avatar = (
    <span className="review-reply-avatar" aria-hidden="true">
      {reply.avatarUrl ? (
        <img src={reply.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <span>{initial}</span>
      )}
    </span>
  );

  return reply.profileSlug ? (
    <Link href={`/members/${reply.profileSlug}`} className="review-reply-avatar-link" aria-label={`الصفحة العامة للعضو ${reply.authorName}`}>
      {avatar}
    </Link>
  ) : avatar;
}

export function ReviewThread({
  reviewId,
  authenticated,
  emailVerified,
}: {
  reviewId: string;
  authenticated: boolean;
  emailVerified: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<RepliesPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const endpoint = `/api/review-replies?reviewId=${encodeURIComponent(reviewId)}`;

  async function loadReplies(force = false) {
    if ((payload && !force) || loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(endpoint, { cache: 'no-store', credentials: 'same-origin' });
      const data = await response.json() as RepliesPayload;
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل الردود.');
      setPayload(data);
      setReplyText(data.myReply?.body || '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر تحميل الردود.');
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await loadReplies();
  }

  async function submitReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = replyText.trim();
    if (saving || clean.length < 2 || clean.length > REPLY_MAX_LENGTH) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/review-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ reviewId, reply: clean }),
      });
      const data = await response.json() as { error?: string; updated?: boolean };
      if (!response.ok) throw new Error(data.error || 'تعذر حفظ الرد.');
      setMessage(data.updated ? 'تم تحديث ردك.' : 'تم نشر ردك.');
      await loadReplies(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر حفظ الرد.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteReply() {
    if (!payload?.myReply || deleting) return;
    if (!window.confirm('هل تريد حذف ردك؟')) return;
    setDeleting(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(endpoint, { method: 'DELETE', credentials: 'same-origin' });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'تعذر حذف الرد.');
      setReplyText('');
      setMessage('تم حذف ردك.');
      await loadReplies(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر حذف الرد.');
    } finally {
      setDeleting(false);
    }
  }

  const actualAuthenticated = payload?.authenticated ?? authenticated;
  const actualVerified = payload?.emailVerified ?? emailVerified;
  const count = payload?.count ?? 0;

  return (
    <div className={`review-thread${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="review-thread__toggle"
        onClick={() => void toggle()}
        aria-expanded={open}
        aria-controls={`review-thread-${reviewId}`}
      >
        <span aria-hidden="true">↩</span>
        <b>{open ? 'إخفاء المناقشة' : 'الردود والمناقشة'}</b>
        {payload ? <small>{count.toLocaleString('ar-EG')}</small> : <small>فتح</small>}
      </button>

      {open ? (
        <div id={`review-thread-${reviewId}`} className="review-thread__panel">
          {loading && !payload ? (
            <div className="review-thread__loading" role="status">جارٍ تحميل الردود…</div>
          ) : error && !payload ? (
            <div className="review-thread__error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={() => void loadReplies(true)}>إعادة المحاولة</button>
            </div>
          ) : (
            <>
              {payload?.replies.length ? (
                <div className="review-thread__list">
                  {payload.replies.map((reply) => (
                    <article className={`review-reply${reply.own ? ' is-own' : ''}`} key={reply.id}>
                      <ReplyAvatar reply={reply} />
                      <div className="review-reply__content">
                        <header>
                          <div>
                            {reply.profileSlug ? (
                              <Link href={`/members/${reply.profileSlug}`}>{reply.authorName}</Link>
                            ) : (
                              <strong>{reply.authorName}</strong>
                            )}
                            {reply.own ? <span>ردك</span> : <span>عضو</span>}
                          </div>
                          <time dateTime={reply.createdAt}>{formatDate(reply.createdAt)}</time>
                        </header>
                        <p>{reply.body}</p>
                        {reply.updatedAt !== reply.createdAt ? <small>تم تعديل الرد</small> : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="review-thread__empty">لا توجد ردود بعد. ابدأ مناقشة مفيدة ومحترمة.</div>
              )}

              <div className="review-thread__composer">
                {actualAuthenticated ? (
                  actualVerified ? (
                    <form onSubmit={submitReply}>
                      <label htmlFor={`reply-${reviewId}`}>{payload?.myReply ? 'تعديل ردك' : 'اكتب ردًا على التقييم'}</label>
                      <textarea
                        id={`reply-${reviewId}`}
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value.slice(0, REPLY_MAX_LENGTH))}
                        placeholder="أضف ردًا مختصرًا ومفيدًا…"
                        maxLength={REPLY_MAX_LENGTH}
                        rows={3}
                        disabled={saving || deleting}
                      />
                      <div className="review-thread__composer-meta">
                        <span>{replyText.trim().length}/{REPLY_MAX_LENGTH}</span>
                        <div>
                          {payload?.myReply ? (
                            <button type="button" className="is-delete" onClick={deleteReply} disabled={saving || deleting}>
                              {deleting ? 'جارٍ الحذف…' : 'حذف ردي'}
                            </button>
                          ) : null}
                          <button type="submit" disabled={saving || replyText.trim().length < 2}>
                            {saving ? 'جارٍ الحفظ…' : payload?.myReply ? 'حفظ التعديل' : 'نشر الرد'}
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div className="review-thread__notice">أكد بريدك الإلكتروني من حسابك قبل المشاركة في الردود.</div>
                  )
                ) : (
                  <div className="review-thread__notice review-thread__notice--guest">
                    <span>الرد متاح للأعضاء المسجلين.</span>
                    <div>
                      <Link href="/account/login">تسجيل الدخول</Link>
                      <Link href="/account/register">إنشاء حساب</Link>
                    </div>
                  </div>
                )}
                <div className="review-thread__feedback" aria-live="polite">
                  {message ? <span className="is-success">{message}</span> : null}
                  {error && payload ? <span className="is-error">{error}</span> : null}
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
