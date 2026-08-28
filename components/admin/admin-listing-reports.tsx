'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'rejected';
type Filter = 'open' | 'all' | ReportStatus;

type ListingSnapshot = {
  id: string;
  slug: string;
  title: string;
  categoryLabel: string;
  village: string;
  locality: string;
  location: string;
  phone: string;
  whatsapp: string;
  hours: string;
  subCategory: string;
  description: string;
  googleMapsUrl: string;
  lastUpdatedAt: string;
};

type ListingReport = {
  id: string;
  userId: string;
  memberName: string;
  listingId: string;
  listing: ListingSnapshot | null;
  reportType: string;
  details: string;
  status: ReportStatus;
  reviewNote: string;
  correction: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  appliedAt: string | null;
};

type ReportsPayload = {
  stats: { open: number; pending: number; reviewing: number; resolved: number; rejected: number; total: number };
  reports: ListingReport[];
};

const statusMeta: Record<ReportStatus, { label: string; hint: string }> = {
  pending: { label: 'جديد', hint: 'بلاغ ينتظر بدء المراجعة.' },
  reviewing: { label: 'قيد المراجعة', hint: 'تم فتح البلاغ ويجري التحقق من البيانات.' },
  resolved: { label: 'تم الحل', hint: 'تم حسم البلاغ واعتماد نتيجة المراجعة.' },
  rejected: { label: 'مرفوض', hint: 'لم يثبت البلاغ أو لا يستلزم تعديل السجل.' },
};

const reportTypeLabels: Record<string, string> = {
  wrong_info: 'بيانات غير صحيحة',
  phone: 'رقم الهاتف',
  location: 'الموقع أو العنوان',
  hours: 'مواعيد العمل',
  closed: 'النشاط مغلق أو غير موجود',
  duplicate: 'سجل مكرر',
  other: 'مشكلة أخرى',
};

const correctionFields: Array<{ key: keyof ListingSnapshot; label: string; multiline?: boolean }> = [
  { key: 'title', label: 'اسم النشاط' },
  { key: 'subCategory', label: 'التخصص / الخدمة' },
  { key: 'location', label: 'وصف الموقع' },
  { key: 'village', label: 'القرية' },
  { key: 'locality', label: 'التابع / النجع' },
  { key: 'phone', label: 'رقم الهاتف' },
  { key: 'whatsapp', label: 'واتساب' },
  { key: 'hours', label: 'مواعيد العمل' },
  { key: 'googleMapsUrl', label: 'رابط خرائط Google' },
  { key: 'description', label: 'الوصف', multiline: true },
];

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

function toDraft(report: ListingReport) {
  const output: Record<string, string> = {};
  Object.entries(report.correction || {}).forEach(([key, value]) => {
    if (typeof value === 'string') output[key] = value;
  });
  return output;
}

export function AdminListingReports() {
  const [payload, setPayload] = useState<ReportsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [filter, setFilter] = useState<Filter>('open');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/reports', { cache: 'no-store', credentials: 'same-origin' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل البلاغات.');
      const next = data as ReportsPayload;
      setPayload(next);
      const seededNotes: Record<string, string> = {};
      const seededDrafts: Record<string, Record<string, string>> = {};
      next.reports.forEach((report) => {
        seededNotes[report.id] = report.reviewNote || '';
        seededDrafts[report.id] = toDraft(report);
      });
      setNotes(seededNotes);
      setDrafts(seededDrafts);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل البلاغات.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reports = useMemo(() => {
    if (!payload) return [];
    if (filter === 'all') return payload.reports;
    if (filter === 'open') return payload.reports.filter((item) => item.status === 'pending' || item.status === 'reviewing');
    return payload.reports.filter((item) => item.status === filter);
  }, [payload, filter]);

  function updateDraft(id: string, key: string, value: string) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...(current[id] || {}), [key]: value },
    }));
  }

  function correctionFor(id: string) {
    const source = drafts[id] || {};
    return Object.fromEntries(Object.entries(source).filter(([, value]) => value.trim().length > 0));
  }

  async function decide(report: ListingReport, status: ReportStatus, useCorrection = false) {
    if (saving) return;
    const note = (notes[report.id] || '').trim();
    const correction = useCorrection ? correctionFor(report.id) : {};

    if (status === 'rejected' && note.length < 3) {
      setError('اكتب سبب رفض واضح قبل رفض البلاغ.');
      return;
    }
    if (status === 'resolved' && useCorrection && Object.keys(correction).length === 0) {
      setError('اكتب قيمة مصححة واحدة على الأقل قبل اعتماد التصحيح.');
      return;
    }

    if (status === 'resolved') {
      const prompt = useCorrection
        ? 'سيتم تطبيق القيم المكتوبة مباشرة على السجل العام وتحديث وقت آخر مراجعة. هل تريد المتابعة؟'
        : 'سيتم حسم البلاغ دون تغيير بيانات السجل. هل تريد المتابعة؟';
      if (!window.confirm(prompt)) return;
    }
    if (status === 'rejected' && !window.confirm('هل تريد رفض هذا البلاغ؟')) return;

    setSaving(`${report.id}:${status}`);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: report.id, status, note, correction }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر حفظ القرار.');

      setMessage(status === 'reviewing'
        ? 'تم تحويل البلاغ إلى قيد المراجعة.'
        : status === 'resolved' && useCorrection
          ? 'تم اعتماد التصحيح وتحديث بيانات النشاط ووقت آخر مراجعة.'
          : status === 'resolved'
            ? 'تم حسم البلاغ دون تعديل بيانات النشاط.'
            : 'تم رفض البلاغ وتسجيل سبب القرار.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ القرار.');
    } finally {
      setSaving('');
    }
  }

  return (
    <section className="admin-reports" id="listing-reports" aria-labelledby="admin-reports-title">
      <div className="admin-reports__head">
        <div>
          <span>مراجعة المجتمع</span>
          <h2 id="admin-reports-title">بلاغات بيانات الأنشطة</h2>
          <p>تحقق من البلاغ، قارن البيانات الحالية، ثم صحّح السجل واعتمده أو ارفض البلاغ مع تسجيل سبب القرار.</p>
        </div>
        <button type="button" onClick={load} disabled={loading}>{loading ? 'جاري التحديث…' : 'تحديث البلاغات'}</button>
      </div>

      {payload && (
        <div className="admin-reports__stats">
          <article><span>تحتاج إجراء</span><strong>{payload.stats.open}</strong></article>
          <article><span>جديدة</span><strong>{payload.stats.pending}</strong></article>
          <article><span>قيد المراجعة</span><strong>{payload.stats.reviewing}</strong></article>
          <article><span>تم حلها</span><strong>{payload.stats.resolved}</strong></article>
          <article><span>إجمالي البلاغات</span><strong>{payload.stats.total}</strong></article>
        </div>
      )}

      <div className="admin-reports__toolbar">
        <label>
          <span>عرض البلاغات</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
            <option value="open">تحتاج إجراء</option>
            <option value="all">كل البلاغات</option>
            <option value="pending">جديدة</option>
            <option value="reviewing">قيد المراجعة</option>
            <option value="resolved">تم الحل</option>
            <option value="rejected">مرفوضة</option>
          </select>
        </label>
        {payload && <span>{reports.length.toLocaleString('ar-EG')} من {payload.stats.total.toLocaleString('ar-EG')}</span>}
      </div>

      {(error || message) && <div className={`admin-reports__feedback${error ? ' is-error' : ' is-success'}`} role={error ? 'alert' : 'status'}>{error || message}</div>}

      {loading && !payload ? (
        <div className="admin-reports__empty">جاري تحميل البلاغات…</div>
      ) : reports.length === 0 ? (
        <div className="admin-reports__empty"><strong>لا توجد بلاغات في هذا العرض</strong><p>غيّر الفلتر أو حدّث البيانات.</p></div>
      ) : (
        <div className="admin-reports__list">
          {reports.map((report) => {
            const listing = report.listing;
            const status = statusMeta[report.status];
            const correction = correctionFor(report.id);
            const hasCorrection = Object.keys(correction).length > 0;
            return (
              <article className="admin-report-card" key={report.id}>
                <div className="admin-report-card__head">
                  <div>
                    <span>{reportTypeLabels[report.reportType] || report.reportType}</span>
                    <h3>{listing?.title || report.listingId}</h3>
                    <p>{report.memberName} · أُرسل {formatDate(report.createdAt)}</p>
                  </div>
                  <span className={`admin-report-status admin-report-status--${report.status}`}>{status.label}</span>
                </div>

                <div className="admin-report-card__status-hint">{status.hint}</div>

                {listing ? (
                  <div className="admin-report-listing">
                    <div><span>القسم</span><b>{listing.categoryLabel}</b></div>
                    <div><span>القرية</span><b>{listing.village}</b></div>
                    <div><span>الموقع الحالي</span><b>{listing.location}</b></div>
                    <div><span>آخر تحديث ظاهر</span><b>{formatDate(listing.lastUpdatedAt)}</b></div>
                    <Link href={`/listing/${listing.slug}`} target="_blank">فتح السجل الحالي ↗</Link>
                  </div>
                ) : <div className="admin-report-missing">السجل المرتبط بهذا البلاغ غير موجود حاليًا في فهرس الدليل.</div>}

                <div className="admin-report-details">
                  <span>تفاصيل البلاغ</span>
                  <p>{report.details}</p>
                </div>

                {listing && report.status !== 'rejected' && (
                  <details className="admin-report-correction" open={report.status === 'reviewing'}>
                    <summary>تصحيح بيانات السجل قبل الاعتماد</summary>
                    <p>اكتب فقط الحقول التي تريد تغييرها. الحقول الفارغة ستبقى كما هي.</p>
                    <div className="admin-report-correction__grid">
                      {correctionFields.map((field) => {
                        const currentValue = String(listing[field.key] || '');
                        const value = drafts[report.id]?.[field.key] || '';
                        return (
                          <label className={field.multiline ? 'is-wide' : ''} key={field.key}>
                            <span>{field.label}</span>
                            <small>الحالي: {currentValue || '—'}</small>
                            {field.multiline ? (
                              <textarea rows={3} maxLength={1200} value={value} onChange={(event) => updateDraft(report.id, field.key, event.target.value)} placeholder="اكتب القيمة الصحيحة فقط عند الحاجة للتعديل" />
                            ) : (
                              <input dir={field.key === 'phone' || field.key === 'whatsapp' ? 'ltr' : undefined} value={value} onChange={(event) => updateDraft(report.id, field.key, event.target.value)} placeholder="اتركه فارغًا إذا لا يوجد تعديل" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                    {hasCorrection && <div className="admin-report-correction__summary"><strong>سيتم تعديل {Object.keys(correction).length.toLocaleString('ar-EG')} حقل/حقول عند الاعتماد.</strong></div>}
                  </details>
                )}

                <div className="admin-report-review">
                  <label>
                    <span>ملاحظة المراجعة</span>
                    <textarea rows={3} maxLength={1200} value={notes[report.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [report.id]: event.target.value }))} placeholder="دوّن سبب القرار أو نتيجة التحقق. سبب الرفض مطلوب." />
                  </label>
                  <div className="admin-report-actions">
                    {report.status === 'pending' && <button className="review" type="button" onClick={() => decide(report, 'reviewing')} disabled={Boolean(saving)}>بدء المراجعة</button>}
                    {listing && report.status !== 'resolved' && report.status !== 'rejected' && <button className="approve" type="button" onClick={() => decide(report, 'resolved', true)} disabled={Boolean(saving) || !hasCorrection}>{saving === `${report.id}:resolved` ? 'جاري الاعتماد…' : 'تصحيح واعتماد'}</button>}
                    {report.status !== 'resolved' && report.status !== 'rejected' && <button className="resolve" type="button" onClick={() => decide(report, 'resolved', false)} disabled={Boolean(saving)}>حسم دون تعديل</button>}
                    {report.status !== 'resolved' && report.status !== 'rejected' && <button className="reject" type="button" onClick={() => decide(report, 'rejected')} disabled={Boolean(saving)}>رفض البلاغ</button>}
                  </div>
                  {report.appliedAt && <small className="admin-report-applied">تم تطبيق التصحيح على السجل في {formatDate(report.appliedAt)}</small>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
