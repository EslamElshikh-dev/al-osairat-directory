'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ReviewStatus = 'pending' | 'needs_changes' | 'approved' | 'rejected';
type Tab = 'submissions' | 'claims';

type Submission = {
  id: string;
  userId: string;
  memberName: string;
  businessName: string;
  category: string;
  categoryLabel: string;
  subCategory: string;
  village: string;
  locality: string;
  locationDetails: string;
  phone: string;
  whatsapp: string;
  hours: string;
  description: string;
  googleMapsUrl: string;
  status: ReviewStatus;
  reviewNote: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};

type Claim = {
  id: string;
  userId: string;
  memberName: string;
  listingId: string;
  listing: {
    slug: string;
    title: string;
    categoryLabel: string;
    village: string;
    location: string;
    publishedPhone: string;
  } | null;
  relationship: string;
  phone: string;
  proofMethod: string;
  proofDetails: string;
  status: ReviewStatus;
  reviewNote: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};

type DashboardData = {
  admin: { displayName: string; avatarUrl: string };
  stats: {
    pendingSubmissions: number;
    pendingClaims: number;
    approvedOwnerships: number;
    totalSubmissions: number;
    totalClaims: number;
  };
  submissions: Submission[];
  claims: Claim[];
};

const statusMeta: Record<ReviewStatus, { label: string; hint: string }> = {
  pending: { label: 'قيد المراجعة', hint: 'طلب جديد ينتظر قرارك.' },
  needs_changes: { label: 'يحتاج استكمال', hint: 'بانتظار استكمال العضو أو تصحيح البيانات.' },
  approved: { label: 'مقبول', hint: 'تم اعتماد الطلب.' },
  rejected: { label: 'مرفوض', hint: 'تم رفض الطلب.' },
};

const relationshipLabels: Record<string, string> = {
  owner: 'مالك النشاط',
  manager: 'مدير النشاط',
  authorized_representative: 'مفوّض عن صاحب النشاط',
};

const proofLabels: Record<string, string> = {
  listing_phone: 'التأكيد عبر الهاتف المنشور',
  google_business_profile: 'ملكية ملف Google التجاري',
  official_document: 'مستند رسمي مرتبط بالنشاط',
  other: 'طريقة إثبات أخرى',
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

function StatusBadge({ status }: { status: ReviewStatus }) {
  return <span className={`admin-status admin-status--${status}`}>{statusMeta[status].label}</span>;
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<Tab>('submissions');
  const [filter, setFilter] = useState<'open' | 'all' | ReviewStatus>('open');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/review', { cache: 'no-store', credentials: 'same-origin' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'تعذر فتح لوحة الإدارة.');
      setData(payload);
      const seededNotes: Record<string, string> = {};
      [...(payload.submissions || []), ...(payload.claims || [])].forEach((item: Submission | Claim) => {
        seededNotes[item.id] = item.reviewNote || '';
      });
      setNotes(seededNotes);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر فتح لوحة الإدارة.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentItems = useMemo(() => {
    if (!data) return [] as Array<Submission | Claim>;
    const items: Array<Submission | Claim> = tab === 'submissions' ? data.submissions : data.claims;
    if (filter === 'all') return items;
    if (filter === 'open') return items.filter((item) => item.status === 'pending' || item.status === 'needs_changes');
    return items.filter((item) => item.status === filter);
  }, [data, tab, filter]);

  async function review(kind: 'submission' | 'claim', id: string, status: ReviewStatus) {
    if (savingKey) return;
    const note = (notes[id] || '').trim();
    if ((status === 'needs_changes' || status === 'rejected') && note.length < 3) {
      setError('اكتب ملاحظة واضحة للعضو قبل طلب الاستكمال أو الرفض.');
      return;
    }

    const destructive = status === 'approved' || status === 'rejected';
    if (destructive) {
      const text = kind === 'claim' && status === 'approved'
        ? 'سيتم ربط هذا النشاط بحساب العضو رسميًا. هل تريد اعتماد المطالبة؟'
        : `هل تريد تأكيد قرار «${statusMeta[status].label}»؟`;
      if (!window.confirm(text)) return;
    }

    setSavingKey(`${kind}:${id}:${status}`);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ kind, id, status, note }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'تعذر حفظ القرار.');
      setMessage(kind === 'claim' && status === 'approved'
        ? 'تم اعتماد مطالبة الملكية وربط النشاط بالحساب.'
        : `تم حفظ القرار: ${statusMeta[status].label}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ القرار.');
    } finally {
      setSavingKey('');
    }
  }

  if (loading && !data) {
    return <div className="admin-loading"><span /><p>جاري فتح لوحة الإدارة…</p></div>;
  }

  if (error && !data) {
    return (
      <section className="admin-denied">
        <span>لوحة خاصة</span>
        <h1>تعذر فتح لوحة الإدارة</h1>
        <p>{error}</p>
        <div><Link href="/account">العودة إلى حسابي</Link><button type="button" onClick={load}>إعادة المحاولة</button></div>
      </section>
    );
  }

  if (!data) return null;

  const initial = data.admin.displayName.trim().charAt(0) || 'إ';

  return (
    <div className="admin-dashboard">
      <section className="admin-hero">
        <div className={`admin-avatar${data.admin.avatarUrl ? ' has-photo' : ''}`}>
          {data.admin.avatarUrl ? <img src={data.admin.avatarUrl} alt="صورة مدير الدليل" referrerPolicy="no-referrer" /> : <span>{initial}</span>}
        </div>
        <div className="admin-hero__copy">
          <span>إدارة خاصة · غير مفهرسة</span>
          <h1>لوحة إدارة دليل العسيرات</h1>
          <p>راجع طلبات إضافة الأنشطة ومطالبات الملكية واتخذ القرار من مكان واحد.</p>
        </div>
        <div className="admin-hero__actions">
          <button type="button" onClick={load} disabled={loading}>{loading ? 'جاري التحديث…' : 'تحديث البيانات'}</button>
          <Link href="/account">حسابي</Link>
        </div>
      </section>

      <section className="admin-stats" aria-label="إحصائيات المراجعة">
        <article><span>طلبات إضافة مفتوحة</span><strong>{data.stats.pendingSubmissions}</strong><small>من {data.stats.totalSubmissions} طلب</small></article>
        <article><span>مطالبات ملكية مفتوحة</span><strong>{data.stats.pendingClaims}</strong><small>من {data.stats.totalClaims} مطالبة</small></article>
        <article><span>ملكيات معتمدة</span><strong>{data.stats.approvedOwnerships}</strong><small>روابط ملكية فعالة</small></article>
      </section>

      {(error || message) && (
        <div className={`admin-feedback${error ? ' is-error' : ' is-success'}`} role={error ? 'alert' : 'status'}>
          {error || message}
        </div>
      )}

      <section className="admin-workspace">
        <div className="admin-toolbar">
          <div className="admin-tabs" role="tablist" aria-label="نوع الطلبات">
            <button className={tab === 'submissions' ? 'is-active' : ''} type="button" onClick={() => setTab('submissions')}>إضافة الأنشطة <b>{data.stats.pendingSubmissions}</b></button>
            <button className={tab === 'claims' ? 'is-active' : ''} type="button" onClick={() => setTab('claims')}>مطالبات الملكية <b>{data.stats.pendingClaims}</b></button>
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} aria-label="تصفية حسب الحالة">
            <option value="open">المفتوحة فقط</option>
            <option value="all">كل الحالات</option>
            <option value="pending">قيد المراجعة</option>
            <option value="needs_changes">يحتاج استكمال</option>
            <option value="approved">مقبول</option>
            <option value="rejected">مرفوض</option>
          </select>
        </div>

        <div className="admin-list">
          {currentItems.length === 0 ? (
            <div className="admin-empty"><strong>لا توجد عناصر في هذا العرض</strong><p>غيّر الفلتر أو حدّث البيانات.</p></div>
          ) : tab === 'submissions' ? (
            (currentItems as Submission[]).map((item) => (
              <article className="admin-review-card" key={item.id}>
                <div className="admin-card__head">
                  <div><span>طلب إضافة نشاط</span><h2>{item.businessName}</h2><p>{item.memberName} · {item.categoryLabel} · {item.village}{item.locality ? ` · ${item.locality}` : ''}</p></div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="admin-detail-grid">
                  <div><span>التخصص / الخدمة</span><b>{item.subCategory || '—'}</b></div>
                  <div><span>وصف الموقع</span><b>{item.locationDetails}</b></div>
                  <div><span>الهاتف</span><b dir="ltr">{item.phone || '—'}</b></div>
                  <div><span>واتساب</span><b dir="ltr">{item.whatsapp || '—'}</b></div>
                  <div><span>المواعيد</span><b>{item.hours || '—'}</b></div>
                  <div><span>تاريخ الإرسال</span><b>{formatDate(item.createdAt)}</b></div>
                </div>

                {item.description && <div className="admin-long-text"><span>وصف النشاط</span><p>{item.description}</p></div>}
                {item.googleMapsUrl && <a className="admin-map-link" href={item.googleMapsUrl} target="_blank" rel="noreferrer">فتح رابط خرائط Google ↗</a>}

                <div className="admin-review-box">
                  <label><span>ملاحظة المراجعة للعضو</span><textarea rows={3} value={notes[item.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={1200} placeholder="اكتب سبب طلب الاستكمال أو الرفض، أو ملاحظة الاعتماد إن لزم." /></label>
                  <div className="admin-review-actions">
                    <button className="needs" type="button" onClick={() => review('submission', item.id, 'needs_changes')} disabled={Boolean(savingKey)}>طلب استكمال</button>
                    <button className="approve" type="button" onClick={() => review('submission', item.id, 'approved')} disabled={Boolean(savingKey)}>قبول</button>
                    <button className="reject" type="button" onClick={() => review('submission', item.id, 'rejected')} disabled={Boolean(savingKey)}>رفض</button>
                  </div>
                  {item.status === 'approved' && <small>اعتماد الطلب لا يضيف السجل تلقائيًا إلى ملفات الدليل البرمجية حتى يتم تنفيذ مسار النشر الإداري.</small>}
                </div>
              </article>
            ))
          ) : (
            (currentItems as Claim[]).map((item) => (
              <article className="admin-review-card admin-review-card--claim" key={item.id}>
                <div className="admin-card__head">
                  <div><span>مطالبة ملكية</span><h2>{item.listing?.title || item.listingId}</h2><p>{item.memberName} · {item.listing?.categoryLabel || 'نشاط'} · {item.listing?.village || '—'}</p></div>
                  <StatusBadge status={item.status} />
                </div>

                {item.listing && (
                  <div className="admin-listing-reference">
                    <div><span>السجل المنشور</span><strong>{item.listing.location}</strong></div>
                    <Link href={`/listing/${item.listing.slug}`} target="_blank">فتح النشاط ↗</Link>
                  </div>
                )}

                <div className="admin-detail-grid">
                  <div><span>صفة مقدم الطلب</span><b>{relationshipLabels[item.relationship] || item.relationship}</b></div>
                  <div><span>طريقة الإثبات</span><b>{proofLabels[item.proofMethod] || item.proofMethod}</b></div>
                  <div><span>رقم التواصل المقدم</span><b dir="ltr">{item.phone}</b></div>
                  <div><span>الرقم المنشور بالنشاط</span><b dir="ltr">{item.listing?.publishedPhone || '—'}</b></div>
                  <div><span>تاريخ الإرسال</span><b>{formatDate(item.createdAt)}</b></div>
                  <div><span>آخر مراجعة</span><b>{formatDate(item.reviewedAt)}</b></div>
                </div>

                <div className="admin-long-text admin-proof"><span>تفاصيل الإثبات</span><p>{item.proofDetails}</p></div>

                <div className="admin-review-box">
                  <label><span>ملاحظة المراجعة للعضو</span><textarea rows={3} value={notes[item.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={1200} placeholder="اكتب ما يحتاج العضو استكماله أو سبب القرار." /></label>
                  <div className="admin-review-actions">
                    <button className="needs" type="button" onClick={() => review('claim', item.id, 'needs_changes')} disabled={Boolean(savingKey)}>طلب استكمال</button>
                    <button className="approve" type="button" onClick={() => review('claim', item.id, 'approved')} disabled={Boolean(savingKey)}>اعتماد الملكية</button>
                    <button className="reject" type="button" onClick={() => review('claim', item.id, 'rejected')} disabled={Boolean(savingKey)}>رفض</button>
                  </div>
                  <small>اعتماد الملكية ينشئ ربطًا رسميًا بين هذا النشاط وحساب العضو في قاعدة البيانات.</small>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
