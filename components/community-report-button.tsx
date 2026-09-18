'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type TargetType = 'review' | 'reply';
type Reason = 'spam' | 'abuse' | 'privacy' | 'misleading' | 'off_topic' | 'other';

const reasonLabels: Record<Reason, string> = {
  spam: 'محتوى مزعج أو دعائي',
  abuse: 'إساءة أو لغة غير مناسبة',
  privacy: 'مشكلة خصوصية أو بيانات شخصية',
  misleading: 'محتوى مضلل أو غير صحيح',
  off_topic: 'خارج موضوع النقاش',
  other: 'سبب آخر',
};

export function CommunityReportButton({
  targetType,
  targetId,
  authenticated,
  emailVerified,
  own = false,
}: {
  targetType: TargetType;
  targetId: string;
  authenticated: boolean;
  emailVerified: boolean;
  own?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>('spam');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  if (own) return null;

  function toggle() {
    if (!authenticated) {
      router.push('/account/login');
      return;
    }
    if (!emailVerified) {
      router.push('/account');
      return;
    }
    setOpen((current) => !current);
    setError('');
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || saved) return;
    if (reason === 'other' && details.trim().length < 3) {
      setError('اكتب تفاصيل مختصرة للسبب الآخر.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/community-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          details: details.trim(),
        }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'تعذر إرسال البلاغ.');
      setSaved(true);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إرسال البلاغ.');
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return <span className="community-report-saved" role="status">✓ تم إرسال البلاغ للمراجعة</span>;
  }

  return (
    <div className={'community-report' + (open ? ' is-open' : '')}>
      <button
        type="button"
        className="community-report__toggle"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={'community-report-' + targetType + '-' + targetId}
      >
        <span aria-hidden="true">⚑</span>
        <b>إبلاغ</b>
      </button>

      {open ? (
        <form id={'community-report-' + targetType + '-' + targetId} className="community-report__panel" onSubmit={submit}>
          <div className="community-report__head">
            <div>
              <strong>إبلاغ عن هذه المساهمة</strong>
              <small>لن يظهر اسمك لصاحب التقييم أو الرد.</small>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق">×</button>
          </div>

          <label>
            <span>سبب البلاغ</span>
            <select value={reason} onChange={(event) => setReason(event.target.value as Reason)} disabled={saving}>
              {Object.entries(reasonLabels).map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </label>

          <label>
            <span>تفاصيل إضافية <small>{reason === 'other' ? 'مطلوبة' : 'اختيارية'}</small></span>
            <textarea
              rows={3}
              maxLength={800}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="اشرح المشكلة باختصار بدون مشاركة بيانات حساسة…"
              disabled={saving}
            />
          </label>

          <div className="community-report__footer">
            <small>{details.trim().length}/800</small>
            <button type="submit" disabled={saving || (reason === 'other' && details.trim().length < 3)}>
              {saving ? 'جارٍ الإرسال…' : 'إرسال للمراجعة'}
            </button>
          </div>

          {error ? <p className="community-report__error" role="alert">{error}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
