'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'rejected';
type Filter = 'open' | 'all' | ReportStatus;

type CommunityReport = {
  id: string;
  userId: string;
  reporterName: string;
  targetType: 'review' | 'reply';
  targetId: string;
  reason: string;
  details: string;
  status: ReportStatus;
  reviewNote: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  target: {
    authorName: string;
    body: string;
    contentStatus: string;
    rating: number | null;
    contextLabel: string;
    href: string;
    reviewId: string;
  };
};

type Payload = {
  stats: { open: number; pending: number; reviewing: number; resolved: number; rejected: number; total: number };
  reports: CommunityReport[];
};

const statusLabels: Record<ReportStatus, string> = {
  pending: 'جديد',
  reviewing: 'قيد المراجعة',
  resolved: 'تم الحسم',
  rejected: 'بلاغ مرفوض',
};

const reasonLabels: Record<string, string> = {
  spam: 'محتوى مزعج أو دعائي',
  abuse: 'إساءة أو لغة غير مناسبة',
  privacy: 'خصوصية أو بيانات شخصية',
  misleading: 'محتوى مضلل أو غير صحيح',
  off_topic: 'خارج موضوع النقاش',
  other: 'سبب آخر',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

export function AdminCommunityReports() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [filter, setFilter] = useState<Filter>('open');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/community-reports', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل بلاغات المجتمع.');
      const next = data as Payload;
      setPayload(next);
      setNotes(Object.fromEntries(next.reports.map((report) => [report.id, report.reviewNote || ''])));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل بلاغات المجتمع.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reports = useMemo(() => {
    if (!payload) return [];
    if (filter === 'all') return payload.reports;
    if (filter === 'open') {
      return payload.reports.filter((report) => report.status === 'pending' || report.status === 'reviewing');
    }
    return payload.reports.filter((report) => report.status === filter);
  }, [filter, payload]);

  async function decide(report: CommunityReport, status: ReportStatus, hideContent = false) {
    if (saving) return;
    const note = (notes[report.id] || '').trim();

    if ((status === 'rejected' || hideContent) && note.length < 3) {
      setError('اكتب ملاحظة واضحة قبل رفض البلاغ أو إخفاء المحتوى.');
      return;
    }

    if (hideContent && !window.confirm('سيتم إخفاء هذه المساهمة عن المجتمع فورًا. هل تريد المتابعة؟')) return;
    if (status === 'rejected' && !window.confirm('سيبقى المحتوى ظاهرًا وسيتم رفض البلاغ. هل تريد المتابعة؟')) return;

    setSaving(report.id + ':' + status + ':' + String(hideContent));
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/community-reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: report.id, status, note, hideContent }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر حفظ القرار.');

      setMessage(
        hideContent
          ? 'تم حسم البلاغ وإخفاء المساهمة من المجتمع.'
          : status === 'reviewing'
            ? 'تم تحويل البلاغ إلى قيد المراجعة.'
            : status === 'resolved'
              ? 'تم حسم البلاغ مع إبقاء المحتوى ظاهرًا.'
              : 'تم رفض البلاغ مع إبقاء المحتوى ظاهرًا.',
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ القرار.');
    } finally {
      setSaving('');
    }
  }

  return (
    <section className="admin-reports admin-reports--community" id="community-reports" aria-labelledby="admin-community-reports-title">
      <div className="admin-reports__head">
        <div>
          <span>سلامة المجتمع</span>
          <h2 id="admin-community-reports-title">بلاغات التقييمات والردود</h2>
          <p>راجع سياق المساهمة قبل القرار. يمكنك إبقاء المحتوى، إخفاءه عند ثبوت المشكلة، أو رفض البلاغ مع توثيق السبب.</p>
        </div>
        <button type="button" onClick={load} disabled={loading}>{loading ? 'جاري التحديث…' : 'تحديث البلاغات'}</button>
      </div>

      {payload ? (
        <div className="admin-reports__stats">
          <article><span>تحتاج إجراء</span><strong>{payload.stats.open}</strong></article>
          <article><span>جديدة</span><strong>{payload.stats.pending}</strong></article>
          <article><span>قيد المراجعة</span><strong>{payload.stats.reviewing}</strong></article>
          <article><span>تم حسمها</span><strong>{payload.stats.resolved}</strong></article>
          <article><span>إجمالي البلاغات</span><strong>{payload.stats.total}</strong></article>
        </div>
      ) : null}

      <div className="admin-reports__toolbar">
        <label>
          <span>عرض البلاغات</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
            <option value="open">تحتاج إجراء</option>
            <option value="all">كل البلاغات</option>
            <option value="pending">جديدة</option>
            <option value="reviewing">قيد المراجعة</option>
            <option value="resolved">تم الحسم</option>
            <option value="rejected">مرفوضة</option>
          </select>
        </label>
        {payload ? <span>{reports.length.toLocaleString('ar-EG')} من {payload.stats.total.toLocaleString('ar-EG')}</span> : null}
      </div>

      {(error || message) ? (
        <div className={'admin-reports__feedback' + (error ? ' is-error' : ' is-success')} role={error ? 'alert' : 'status'}>
          {error || message}
        </div>
      ) : null}

      {loading && !payload ? (
        <div className="admin-reports__empty">جاري تحميل بلاغات المجتمع…</div>
      ) : reports.length === 0 ? (
        <div className="admin-reports__empty"><strong>لا توجد بلاغات في هذا العرض</strong><p>غيّر الفلتر أو حدّث البيانات.</p></div>
      ) : (
        <div className="admin-reports__list">
          {reports.map((report) => (
            <article className="admin-report-card" key={report.id}>
              <div className="admin-report-card__head">
                <div>
                  <span>{reasonLabels[report.reason] || report.reason}</span>
                  <h3>{report.targetType === 'review' ? 'بلاغ على تقييم' : 'بلاغ على رد'}</h3>
                  <p>{report.reporterName} · أُرسل {formatDate(report.createdAt)}</p>
                </div>
                <span className={'admin-report-status admin-report-status--' + report.status}>{statusLabels[report.status]}</span>
              </div>

              <div className="admin-report-listing">
                <div><span>كاتب المحتوى</span><b>{report.target.authorName}</b></div>
                <div><span>السياق</span><b>{report.target.contextLabel}</b></div>
                <div><span>حالة المحتوى</span><b>{report.target.contentStatus === 'hidden' ? 'مخفي' : 'ظاهر'}</b></div>
                <div><span>نوع المساهمة</span><b>{report.targetType === 'review' ? 'تقييم' : 'رد'}</b></div>
                <Link href={report.target.href} target="_blank">فتح سياق المساهمة ↗</Link>
              </div>

              <div className="admin-report-details">
                <span>المحتوى المُبلّغ عنه</span>
                <p>{report.target.body || 'المحتوى لم يعد متاحًا.'}</p>
              </div>

              {report.details ? (
                <div className="admin-report-details">
                  <span>تفاصيل المبلّغ</span>
                  <p>{report.details}</p>
                </div>
              ) : null}

              <div className="admin-report-review">
                <label>
                  <span>ملاحظة المراجعة</span>
                  <textarea
                    rows={3}
                    maxLength={1200}
                    value={notes[report.id] || ''}
                    onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                    placeholder="دوّن نتيجة التحقق. الملاحظة مطلوبة عند الإخفاء أو رفض البلاغ."
                  />
                </label>
                <div className="admin-report-actions">
                  {report.status === 'pending' ? (
                    <button className="review" type="button" onClick={() => void decide(report, 'reviewing')} disabled={Boolean(saving)}>
                      بدء المراجعة
                    </button>
                  ) : null}
                  {report.status !== 'resolved' && report.status !== 'rejected' ? (
                    <>
                      <button className="resolve" type="button" onClick={() => void decide(report, 'resolved', false)} disabled={Boolean(saving)}>
                        حسم وإبقاء المحتوى
                      </button>
                      <button className="reject" type="button" onClick={() => void decide(report, 'rejected', false)} disabled={Boolean(saving)}>
                        رفض البلاغ
                      </button>
                      <button className="approve" type="button" onClick={() => void decide(report, 'resolved', true)} disabled={Boolean(saving) || report.target.contentStatus === 'hidden'}>
                        إخفاء المحتوى
                      </button>
                    </>
                  ) : null}
                </div>
                {report.reviewedAt ? <small className="admin-report-applied">آخر قرار: {formatDate(report.reviewedAt)}</small> : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
