'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';

type ReportType = 'wrong_info' | 'closed' | 'duplicate' | 'phone' | 'location' | 'hours' | 'other';

const reportOptions: Array<{ value: ReportType; label: string }> = [
  { value: 'wrong_info', label: 'بيانات غير صحيحة' },
  { value: 'phone', label: 'رقم الهاتف' },
  { value: 'location', label: 'الموقع أو العنوان' },
  { value: 'hours', label: 'مواعيد العمل' },
  { value: 'closed', label: 'النشاط مغلق أو غير موجود' },
  { value: 'duplicate', label: 'سجل مكرر' },
  { value: 'other', label: 'مشكلة أخرى' },
];

export function ListingReport({ listingId, listingTitle }: { listingId: string; listingTitle: string }) {
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('wrong_info');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setMessage('');
    setNeedsLogin(false);

    try {
      const response = await fetch('/api/listing-reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ listingId, reportType, details }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401) setNeedsLogin(true);
        throw new Error(data.error || 'تعذر إرسال البلاغ الآن.');
      }

      setDetails('');
      setMessage('تم استلام البلاغ للمراجعة. لن تتغير بيانات النشاط قبل التحقق منها.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إرسال البلاغ الآن.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`listing-report${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="listing-report__toggle"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          setError('');
          setMessage('');
          setNeedsLogin(false);
        }}
      >
        <span aria-hidden="true">!</span>
        <span>
          <strong>وجدت معلومة غير صحيحة؟</strong>
          <small>أرسل بلاغًا لمراجعة بيانات هذا النشاط</small>
        </span>
        <b aria-hidden="true">{open ? '−' : '+'}</b>
      </button>

      {open && (
        <form className="listing-report__panel" onSubmit={submit}>
          <div className="listing-report__intro">
            <strong>الإبلاغ عن خطأ في «{listingTitle}»</strong>
            <p>البلاغ يدخل للمراجعة أولًا ولا يعدّل السجل تلقائيًا. اكتب المعلومة الصحيحة أو سبب البلاغ بأكبر قدر ممكن من الوضوح.</p>
          </div>

          <label>
            <span>نوع المشكلة</span>
            <select value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)}>
              {reportOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label>
            <span>تفاصيل البلاغ</span>
            <textarea
              rows={4}
              maxLength={1200}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="مثال: رقم الهاتف المنشور قديم، والرقم الصحيح هو... أو النشاط انتقل من هذا العنوان..."
              required
            />
            <small>{details.length}/1200</small>
          </label>

          {error && (
            <div className="listing-report__feedback is-error" role="alert">
              <span>{error}</span>
              {needsLogin && <Link href={`/account/login?next=${encodeURIComponent(`/listing/${listingId}`)}`}>تسجيل الدخول</Link>}
            </div>
          )}
          {message && <div className="listing-report__feedback is-success" role="status">{message}</div>}

          <div className="listing-report__submit">
            <small>لا ترسل كلمات مرور أو رموز تحقق أو بيانات شخصية حساسة.</small>
            <button type="submit" disabled={saving || details.trim().length < 8}>{saving ? 'جاري الإرسال…' : 'إرسال البلاغ للمراجعة'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
