'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ReviewStatus = 'pending' | 'needs_changes' | 'approved' | 'rejected';
type Tab = 'submissions' | 'claims' | 'changes';

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
  publishedAt: string | null;
  publishedListing: { listingId: string; slug: string; title: string } | null;
};

type Claim = {
  id: string;
  userId: string;
  memberName: string;
  listingId: string;
  listing: { slug: string; title: string; categoryLabel: string; village: string; location: string; publishedPhone: string } | null;
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

type ChangeRequest = {
  id: string;
  userId: string;
  memberName: string;
  listingId: string;
  listing: { slug: string; title: string; categoryLabel: string; village: string; location: string } | null;
  snapshot: Record<string, unknown>;
  changes: Record<string, unknown>;
  status: ReviewStatus;
  reviewNote: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  appliedAt: string | null;
};

type DashboardData = {
  admin: { displayName: string; avatarUrl: string };
  stats: {
    pendingSubmissions: number;
    pendingClaims: number;
    pendingChanges: number;
    approvedOwnerships: number;
    publishedBusinesses: number;
    totalSubmissions: number;
    totalClaims: number;
    totalChanges: number;
  };
  submissions: Submission[];
  claims: Claim[];
  changeRequests: ChangeRequest[];
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

const changeFieldLabels: Record<string, string> = {
  title: 'اسم النشاط',
  subCategory: 'التخصص أو الخدمة',
  location: 'وصف الموقع',
  village: 'القرية',
  locality: 'التابع / النجع',
  phone: 'رقم الهاتف',
  whatsapp: 'واتساب',
  hours: 'مواعيد العمل',
  description: 'الوصف',
  googleMapsUrl: 'رابط خرائط Google',
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

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
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
      [...(payload.submissions || []), ...(payload.claims || []), ...(payload.changeRequests || [])]
        .forEach((item: Submission | Claim | ChangeRequest) => { seededNotes[item.id] = item.reviewNote || ''; });
      setNotes(seededNotes);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر فتح لوحة الإدارة.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentItems = useMemo(() => {
    if (!data) return [] as Array<Submission | Claim | ChangeRequest>;
    const items: Array<Submission | Claim | ChangeRequest> = tab === 'submissions'
      ? data.submissions
      : tab === 'claims'
        ? data.claims
        : data.changeRequests;
    if (filter === 'all') return items;
    if (filter === 'open') {
      if (tab === 'submissions') {
        return (items as Submission[]).filter((item) =>
          item.status === 'pending' || item.status === 'needs_changes' || (item.status === 'approved' && !item.publishedListing),
        );
      }
      return items.filter((item) => item.status === 'pending' || item.status === 'needs_changes');
    }
    return items.filter((item) => item.status === filter);
  }, [data, tab, filter]);

  async function review(kind: 'submission' | 'claim' | 'change', id: string, status: ReviewStatus) {
    if (savingKey) return;
    const note = (notes[id] || '').trim();
    if ((status === 'needs_changes' || status === 'rejected') && note.length < 3) {
      setError('اكتب ملاحظة واضحة للعضو قبل طلب الاستكمال أو الرفض.');
      return;
    }

    if (status === 'approved' || status === 'rejected') {
      const text = kind === 'claim' && status === 'approved'
        ? 'سيتم ربط هذا النشاط بحساب العضو رسميًا. هل تريد اعتماد المطالبة؟'
        : kind === 'change' && status === 'approved'
          ? 'سيتم تطبيق هذه التعديلات على بيانات النشاط العامة فورًا. هل تريد الاعتماد؟'
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
        : kind === 'change' && status === 'approved'
          ? 'تم اعتماد التعديلات وتطبيقها على بيانات النشاط.'
          : `تم حفظ القرار: ${statusMeta[status].label}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ القرار.');
    } finally {
      setSavingKey('');
    }
  }

  async function publishSubmission(item: Submission) {
    if (savingKey || item.publishedListing) return;
    if (item.status === 'rejected') {
      setError('لا يمكن نشر طلب مرفوض.');
      return;
    }
    if (!window.confirm(`سيتم اعتماد «${item.businessName}» ونشره فورًا في الدليل العام. هل تريد المتابعة؟`)) return;

    setSavingKey(`publish:${item.id}`);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: item.id, note: (notes[item.id] || '').trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'تعذر نشر النشاط.');
      setMessage(payload.alreadyPublished
        ? 'النشاط منشور بالفعل وتم تحديث حالة اللوحة.'
        : 'تم اعتماد النشاط ونشره في الدليل العام بنجاح.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر نشر النشاط.');
    } finally {
      setSavingKey('');
    }
  }

  if (loading && !data) return <div className="admin-loading"><span /><p>جاري فتح لوحة الإدارة…</p></div>;

  if (error && !data) {
    return (
      <section className="admin-denied">
        <span>لوحة خاصة</span>
        <h2>تعذر فتح صندوق العمل</h2>
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
          <span>أولوية التشغيل</span>
          <h2>صندوق الطلبات والمراجعات</h2>
          <p>ابدأ بالعناصر التي تحتاج إجراء: طلبات إضافة الأنشطة ومطالبات الملكية وتعديلات البيانات.</p>
        </div>
        <div className="admin-hero__actions">
          <button type="button" onClick={load} disabled={loading}>{loading ? 'جاري التحديث…' : 'تحديث البيانات'}</button>
          <Link href="/account">حسابي</Link>
        </div>
      </section>

      <section className="admin-stats" aria-label="إحصائيات المراجعة">
        <article><span>طلبات إضافة تحتاج إجراء</span><strong>{data.stats.pendingSubmissions}</strong><small>من {data.stats.totalSubmissions} طلب</small></article>
        <article><span>تعديلات تحتاج إجراء</span><strong>{data.stats.pendingChanges}</strong><small>من {data.stats.totalChanges} طلب تعديل</small></article>
        <article><span>مطالبات ملكية مفتوحة</span><strong>{data.stats.pendingClaims}</strong><small>من {data.stats.totalClaims} مطالبة</small></article>
        <article><span>ملكيات معتمدة</span><strong>{data.stats.approvedOwnerships}</strong><small>روابط ملكية فعالة</small></article>
        <article><span>أنشطة منشورة من الطلبات</span><strong>{data.stats.publishedBusinesses}</strong><small>سجلات حية في الدليل</small></article>
      </section>

      {(error || message) && (
        <div className={`admin-feedback${error ? ' is-error' : ' is-success'}`} role={error ? 'alert' : 'status'}>{error || message}</div>
      )}

      <section className="admin-workspace">
        <div className="admin-toolbar">
          <div className="admin-tabs" role="tablist" aria-label="نوع الطلبات">
            <button className={tab === 'submissions' ? 'is-active' : ''} type="button" onClick={() => setTab('submissions')}>إضافة الأنشطة <b>{data.stats.pendingSubmissions}</b></button>
            <button className={tab === 'claims' ? 'is-active' : ''} type="button" onClick={() => setTab('claims')}>مطالبات الملكية <b>{data.stats.pendingClaims}</b></button>
            <button className={tab === 'changes' ? 'is-active' : ''} type="button" onClick={() => setTab('changes')}>تعديلات الأنشطة <b>{data.stats.pendingChanges}</b></button>
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} aria-label="تصفية حسب الحالة">
            <option value="open">تحتاج إجراء</option>
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
                  {item.publishedListing ? <span className="admin-status admin-status--published">منشور</span> : <StatusBadge status={item.status} />}
                </div>
                <div className="admin-detail-grid">
                  <div><span>التخصص / الخدمة</span><b>{item.subCategory || '—'}</b></div><div><span>وصف الموقع</span><b>{item.locationDetails}</b></div>
                  <div><span>الهاتف</span><b dir="ltr">{item.phone || '—'}</b></div><div><span>واتساب</span><b dir="ltr">{item.whatsapp || '—'}</b></div>
                  <div><span>المواعيد</span><b>{item.hours || '—'}</b></div><div><span>تاريخ الإرسال</span><b>{formatDate(item.createdAt)}</b></div>
                </div>
                {item.description && <div className="admin-long-text"><span>وصف النشاط</span><p>{item.description}</p></div>}
                {item.googleMapsUrl && <a className="admin-map-link" href={item.googleMapsUrl} target="_blank" rel="noreferrer">فتح رابط خرائط Google ↗</a>}
                {item.publishedListing && <div className="admin-listing-reference admin-published-reference"><div><span>تم النشر</span><strong>{formatDate(item.publishedAt)}</strong></div><Link href={`/listing/${item.publishedListing.slug}`} target="_blank">فتح النشاط المنشور ↗</Link></div>}
                <div className="admin-review-box">
                  <label><span>ملاحظة المراجعة للعضو</span><textarea rows={3} value={notes[item.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={1200} placeholder="اكتب سبب طلب الاستكمال أو الرفض، أو ملاحظة الاعتماد إن لزم." disabled={Boolean(item.publishedListing)} /></label>
                  {item.publishedListing ? <small>هذا الطلب تحوّل بالفعل إلى سجل منشور في الدليل العام.</small> : <div className="admin-review-actions"><button className="needs" type="button" onClick={() => review('submission', item.id, 'needs_changes')} disabled={Boolean(savingKey)}>طلب استكمال</button><button className="approve publish" type="button" onClick={() => publishSubmission(item)} disabled={Boolean(savingKey)}>{savingKey === `publish:${item.id}` ? 'جاري النشر…' : 'اعتماد ونشر النشاط'}</button><button className="reject" type="button" onClick={() => review('submission', item.id, 'rejected')} disabled={Boolean(savingKey)}>رفض</button></div>}
                </div>
              </article>
            ))
          ) : tab === 'claims' ? (
            (currentItems as Claim[]).map((item) => (
              <article className="admin-review-card admin-review-card--claim" key={item.id}>
                <div className="admin-card__head"><div><span>مطالبة ملكية</span><h2>{item.listing?.title || item.listingId}</h2><p>{item.memberName} · {item.listing?.categoryLabel || 'نشاط'} · {item.listing?.village || '—'}</p></div><StatusBadge status={item.status} /></div>
                {item.listing && <div className="admin-listing-reference"><div><span>السجل المنشور</span><strong>{item.listing.location}</strong></div><Link href={`/listing/${item.listing.slug}`} target="_blank">فتح النشاط ↗</Link></div>}
                <div className="admin-detail-grid">
                  <div><span>صفة مقدم الطلب</span><b>{relationshipLabels[item.relationship] || item.relationship}</b></div><div><span>طريقة الإثبات</span><b>{proofLabels[item.proofMethod] || item.proofMethod}</b></div>
                  <div><span>رقم التواصل المقدم</span><b dir="ltr">{item.phone}</b></div><div><span>الرقم المنشور بالنشاط</span><b dir="ltr">{item.listing?.publishedPhone || '—'}</b></div>
                  <div><span>تاريخ الإرسال</span><b>{formatDate(item.createdAt)}</b></div><div><span>آخر مراجعة</span><b>{formatDate(item.reviewedAt)}</b></div>
                </div>
                <div className="admin-long-text admin-proof"><span>تفاصيل الإثبات</span><p>{item.proofDetails}</p></div>
                <div className="admin-review-box"><label><span>ملاحظة المراجعة للعضو</span><textarea rows={3} value={notes[item.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={1200} placeholder="اكتب ما يحتاج العضو استكماله أو سبب القرار." /></label><div className="admin-review-actions"><button className="needs" type="button" onClick={() => review('claim', item.id, 'needs_changes')} disabled={Boolean(savingKey)}>طلب استكمال</button><button className="approve" type="button" onClick={() => review('claim', item.id, 'approved')} disabled={Boolean(savingKey)}>اعتماد الملكية</button><button className="reject" type="button" onClick={() => review('claim', item.id, 'rejected')} disabled={Boolean(savingKey)}>رفض</button></div><small>اعتماد الملكية ينشئ ربطًا رسميًا بين هذا النشاط وحساب العضو في قاعدة البيانات.</small></div>
              </article>
            ))
          ) : (
            (currentItems as ChangeRequest[]).map((item) => (
              <article className="admin-review-card admin-review-card--change" key={item.id}>
                <div className="admin-card__head">
                  <div><span>طلب تعديل بيانات نشاط</span><h2>{item.listing?.title || displayValue(item.snapshot.title)}</h2><p>{item.memberName} · {item.listing?.categoryLabel || 'نشاط'} · {item.listing?.village || displayValue(item.snapshot.village)}</p></div>
                  {item.appliedAt ? <span className="admin-status admin-status--published">تم التطبيق</span> : <StatusBadge status={item.status} />}
                </div>
                {item.listing && <div className="admin-listing-reference"><div><span>النشاط الحالي</span><strong>{item.listing.location}</strong></div><Link href={`/listing/${item.listing.slug}`} target="_blank">فتح النشاط ↗</Link></div>}
                <div className="admin-change-diff">
                  {Object.entries(item.changes).map(([key, nextValue]) => (
                    <div className="admin-change-row" key={key}>
                      <span>{changeFieldLabels[key] || key}</span>
                      <div><small>الحالي</small><b>{displayValue(item.snapshot[key])}</b></div>
                      <i aria-hidden="true">←</i>
                      <div className="is-new"><small>المطلوب</small><b>{displayValue(nextValue)}</b></div>
                    </div>
                  ))}
                </div>
                <div className="admin-detail-grid"><div><span>تاريخ الإرسال</span><b>{formatDate(item.createdAt)}</b></div><div><span>آخر مراجعة</span><b>{formatDate(item.reviewedAt)}</b></div></div>
                <div className="admin-review-box">
                  <label><span>ملاحظة المراجعة للعضو</span><textarea rows={3} value={notes[item.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={1200} placeholder="اكتب ما يحتاج تصحيحًا أو ملاحظة الاعتماد." disabled={Boolean(item.appliedAt)} /></label>
                  {item.appliedAt ? <small>تم تطبيق هذا الطلب على بيانات النشاط بتاريخ {formatDate(item.appliedAt)}.</small> : <><div className="admin-review-actions"><button className="needs" type="button" onClick={() => review('change', item.id, 'needs_changes')} disabled={Boolean(savingKey)}>طلب استكمال</button><button className="approve" type="button" onClick={() => review('change', item.id, 'approved')} disabled={Boolean(savingKey)}>اعتماد وتطبيق</button><button className="reject" type="button" onClick={() => review('change', item.id, 'rejected')} disabled={Boolean(savingKey)}>رفض</button></div><small>الاعتماد يطبّق القيم المطلوبة على النشاط العام فورًا. الأنشطة القديمة تستخدم طبقة تحديث ديناميكية فوق بياناتها الأصلية.</small></>}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
