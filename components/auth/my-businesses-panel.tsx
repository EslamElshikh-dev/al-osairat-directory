'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { villages } from '@/lib/data/base';
import {
  isValidEgyptianMobile,
  isValidEgyptianPhone,
  normalizeGoogleMapsUrl,
} from '@/lib/business-submission-validation';

type ReviewStatus = 'pending' | 'needs_changes' | 'approved' | 'rejected';

type Business = {
  listingId: string;
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  subCategory: string;
  location: string;
  village: string;
  locality: string;
  phone: string;
  whatsapp: string;
  hours: string;
  description: string;
  googleMapsUrl: string;
  relationship: string;
  approvedAt: string;
};

type ChangeRequest = {
  id: string;
  listingId: string;
  listingTitle: string;
  snapshot: Record<string, unknown>;
  changes: Record<string, unknown>;
  status: ReviewStatus;
  reviewNote: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  appliedAt: string | null;
};

type FormState = Pick<Business, 'title' | 'subCategory' | 'location' | 'village' | 'locality' | 'phone' | 'whatsapp' | 'hours' | 'description' | 'googleMapsUrl'>;

const allowedVillages = villages.filter((item) => item.name !== 'مركز العسيرات');

const statusMeta: Record<ReviewStatus, { label: string; hint: string }> = {
  pending: { label: 'قيد المراجعة', hint: 'التعديلات لم تُنشر بعد.' },
  needs_changes: { label: 'يحتاج استكمال', hint: 'راجع ملاحظة الإدارة، عدّل البيانات، ثم أعد إرسال نفس الطلب.' },
  approved: { label: 'تم الاعتماد', hint: 'تم تطبيق التعديلات المعتمدة على النشاط.' },
  rejected: { label: 'غير مقبول', hint: 'لم يتم تطبيق التعديلات المطلوبة.' },
};

const relationshipLabels: Record<string, string> = {
  owner: 'مالك النشاط',
  manager: 'مدير النشاط',
  authorized_representative: 'مفوّض عن صاحب النشاط',
};

const fieldLabels: Record<string, string> = {
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
    return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
  } catch {
    return '—';
  }
}

function formFromBusiness(business: Business): FormState {
  return {
    title: business.title,
    subCategory: business.subCategory,
    location: business.location,
    village: business.village,
    locality: business.locality,
    phone: business.phone,
    whatsapp: business.whatsapp,
    hours: business.hours,
    description: business.description,
    googleMapsUrl: business.googleMapsUrl,
  };
}

export function MyBusinessesPanel() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState('');
  const [editingRequestId, setEditingRequestId] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/my-businesses', { cache: 'no-store', credentials: 'same-origin' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'تعذر تحميل أنشطتك.');
      setBusinesses(payload.businesses || []);
      setRequests(payload.requests || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل أنشطتك.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectedVillage = useMemo(
    () => allowedVillages.find((item) => item.name === form?.village),
    [form?.village],
  );

  const openRequestByListing = useMemo(() => {
    const map = new Map<string, ChangeRequest>();
    requests.forEach((item) => {
      if ((item.status === 'pending' || item.status === 'needs_changes') && !map.has(item.listingId)) map.set(item.listingId, item);
    });
    return map;
  }, [requests]);

  function startEditing(business: Business, requestId = '') {
    setEditingId(business.listingId);
    setEditingRequestId(requestId);
    setForm(formFromBusiness(business));
    setError('');
    setMessage('');
  }

  function cancelEditing() {
    setEditingId('');
    setEditingRequestId('');
    setForm(null);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current);
    setError('');
    setMessage('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || !editingId || saving) return;

    if (form.title.trim().length < 2) return setError('اكتب اسم النشاط بشكل صحيح.');
    if (form.location.trim().length < 3) return setError('اكتب وصفًا واضحًا لموقع النشاط.');
    if (!allowedVillages.some((item) => item.name === form.village)) return setError('اختر قرية صحيحة داخل مركز العسيرات.');
    if (form.phone.trim() && !isValidEgyptianPhone(form.phone)) return setError('رقم الهاتف غير صحيح.');
    if (form.whatsapp.trim() && !isValidEgyptianMobile(form.whatsapp)) return setError('رقم واتساب غير صحيح.');
    if (form.googleMapsUrl.trim() && !normalizeGoogleMapsUrl(form.googleMapsUrl)) return setError('رابط خرائط Google غير صحيح.');
    if (!form.phone.trim() && !form.whatsapp.trim() && !form.googleMapsUrl.trim()) return setError('اترك وسيلة تواصل واحدة على الأقل.');

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/my-businesses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ listingId: editingId, requestId: editingRequestId || undefined, ...form }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'تعذر إرسال طلب التعديل.');
      setMessage(editingRequestId
        ? 'تم استكمال التعديلات وإعادة إرسال الطلب للمراجعة.'
        : 'أُرسلت التعديلات للمراجعة، وستبقى بيانات النشاط الحالية كما هي حتى اعتمادها.');
      cancelEditing();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إرسال طلب التعديل.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="my-businesses-panel" aria-labelledby="my-businesses-title">
      <div className="my-businesses-heading">
        <div>
          <span>إدارة الملكية</span>
          <h2 id="my-businesses-title">أنشطتي</h2>
          <p>الأنشطة التي تم اعتماد ملكيتها أو إدارتها لحسابك. أي تعديل جديد يمر بالمراجعة قبل ظهوره للعامة.</p>
        </div>
        <span className="my-businesses-count">{loading ? '...' : `${businesses.length} نشاط`}</span>
      </div>

      {error && <div className="my-businesses-feedback is-error" role="alert">{error}</div>}
      {message && <div className="my-businesses-feedback is-success" role="status">{message}</div>}

      {loading ? (
        <div className="my-businesses-empty">جارٍ تحميل أنشطتك…</div>
      ) : businesses.length ? (
        <div className="my-businesses-list">
          {businesses.map((business) => {
            const openRequest = openRequestByListing.get(business.listingId);
            const isEditing = editingId === business.listingId && form;
            const canRevise = openRequest?.status === 'needs_changes';
            return (
              <article className="my-business-card" key={business.listingId}>
                <div className="my-business-card__head">
                  <div>
                    <span>{business.categoryLabel} · {relationshipLabels[business.relationship] || business.relationship}</span>
                    <h3>{business.title}</h3>
                    <p>{business.location} · {business.village}{business.locality ? ` · ${business.locality}` : ''}</p>
                  </div>
                  <span className="my-business-owned">ملكية معتمدة</span>
                </div>

                <div className="my-business-card__actions">
                  <Link href={`/listing/${business.slug}`}>عرض النشاط</Link>
                  <button
                    type="button"
                    onClick={() => startEditing(business, canRevise ? openRequest?.id : '')}
                    disabled={openRequest?.status === 'pending'}
                  >
                    {openRequest?.status === 'pending'
                      ? 'طلب التعديل قيد المراجعة'
                      : canRevise
                        ? 'استكمال التعديل'
                        : isEditing
                          ? 'تعديل البيانات مفتوح'
                          : 'طلب تعديل البيانات'}
                  </button>
                </div>

                {openRequest && (
                  <div className={`my-business-open-request status-${openRequest.status}`}>
                    <strong>{statusMeta[openRequest.status].label}</strong>
                    <span>{statusMeta[openRequest.status].hint}</span>
                    {openRequest.reviewNote && <p><b>ملاحظة الإدارة:</b> {openRequest.reviewNote}</p>}
                  </div>
                )}

                {isEditing && (
                  <form className="my-business-edit-form" onSubmit={submit}>
                    <div className="my-business-edit-grid">
                      <label><span>اسم النشاط *</span><input value={form.title} onChange={(e) => update('title', e.target.value)} maxLength={120} required /></label>
                      <label><span>التخصص أو الخدمة</span><input value={form.subCategory} onChange={(e) => update('subCategory', e.target.value)} maxLength={120} /></label>
                      <label><span>القرية *</span><select value={form.village} onChange={(e) => setForm((current) => current ? { ...current, village: e.target.value, locality: '' } : current)} required>{allowedVillages.map((item) => <option key={item.slug} value={item.name}>{item.name}</option>)}</select></label>
                      <label><span>التابع / النجع</span><input value={form.locality} onChange={(e) => update('locality', e.target.value)} list={`owned-localities-${business.listingId}`} maxLength={100} /><datalist id={`owned-localities-${business.listingId}`}>{(selectedVillage?.localities || []).map((item) => <option value={item} key={item} />)}</datalist></label>
                      <label className="wide"><span>وصف الموقع *</span><input value={form.location} onChange={(e) => update('location', e.target.value)} maxLength={240} required /></label>
                      <label><span>رقم الهاتف</span><input dir="ltr" inputMode="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} maxLength={24} placeholder="01xxxxxxxxx" /></label>
                      <label><span>رقم واتساب</span><input dir="ltr" inputMode="tel" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} maxLength={24} placeholder="01xxxxxxxxx" /></label>
                      <label><span>مواعيد العمل</span><input value={form.hours} onChange={(e) => update('hours', e.target.value)} maxLength={180} /></label>
                      <label><span>رابط خرائط Google</span><input dir="ltr" value={form.googleMapsUrl} onChange={(e) => update('googleMapsUrl', e.target.value)} maxLength={500} placeholder="https://maps.app.goo.gl/..." /></label>
                      <label className="wide"><span>وصف النشاط</span><textarea rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} maxLength={800} /><small>{form.description.length}/800</small></label>
                    </div>
                    <div className="my-business-edit-note">لن يتم تغيير الصفحة العامة الآن. ستظهر التعديلات فقط بعد اعتمادها من إدارة الدليل.</div>
                    <div className="my-business-edit-actions">
                      <button type="button" onClick={cancelEditing} disabled={saving}>إلغاء</button>
                      <button type="submit" disabled={saving}>{saving ? 'جارٍ إرسال التعديلات…' : editingRequestId ? 'إعادة الإرسال للمراجعة' : 'إرسال التعديلات للمراجعة'}</button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="my-businesses-empty">
          <strong>لا توجد أنشطة مرتبطة بحسابك حتى الآن</strong>
          <p>بعد اعتماد مطالبة ملكية نشاط، سيظهر النشاط هنا تلقائيًا وتقدر ترسل تعديلات بياناته للمراجعة.</p>
        </div>
      )}

      {requests.length > 0 && (
        <div className="my-change-history">
          <div className="my-change-history__heading"><span>سجل المراجعة</span><h3>طلبات تعديل البيانات</h3></div>
          <div className="my-change-history__list">
            {requests.map((request) => (
              <article key={request.id}>
                <div><strong>{request.listingTitle}</strong><span className={`change-status change-status--${request.status}`}>{statusMeta[request.status].label}</span></div>
                <p>{Object.keys(request.changes).map((key) => fieldLabels[key] || key).join(' · ')}</p>
                <small>أُرسل {formatDate(request.createdAt)}{request.appliedAt ? ` · طُبق ${formatDate(request.appliedAt)}` : ''}</small>
                {request.reviewNote && <div className="change-review-note"><b>ملاحظة الإدارة:</b> {request.reviewNote}</div>}
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
