'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { categories, villages } from '@/lib/data/base';

type SubmissionStatus = 'pending' | 'needs_changes' | 'approved' | 'rejected';

type Submission = {
  id: string;
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
  status: SubmissionStatus;
  reviewNote: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};

type FormState = {
  businessName: string;
  category: string;
  subCategory: string;
  village: string;
  locality: string;
  locationDetails: string;
  phone: string;
  whatsapp: string;
  hours: string;
  description: string;
  googleMapsUrl: string;
};

const allowedCategories = categories.filter((category) => !['emergency', 'government'].includes(category.id));
const allowedVillages = villages.filter((village) => village.name !== 'مركز العسيرات');

const emptyForm: FormState = {
  businessName: '',
  category: '',
  subCategory: '',
  village: '',
  locality: '',
  locationDetails: '',
  phone: '',
  whatsapp: '',
  hours: '',
  description: '',
  googleMapsUrl: '',
};

const statusInfo: Record<SubmissionStatus, { label: string; hint: string }> = {
  pending: { label: 'قيد المراجعة', hint: 'وصل الطلب وسيتم التحقق من البيانات قبل النشر.' },
  needs_changes: { label: 'يحتاج تعديل', hint: 'توجد بيانات تحتاج استكمالًا أو تصحيحًا قبل النشر.' },
  approved: { label: 'مقبول', hint: 'تمت الموافقة على الطلب بعد المراجعة.' },
  rejected: { label: 'غير مقبول', hint: 'تعذر اعتماد الطلب بصورته الحالية.' },
};

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
  } catch {
    return '';
  }
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 20V8.8L12 4l7.5 4.8V20" />
      <path d="M8.2 20v-5.2h7.6V20M12 8.2v4M10 10.2h4" />
    </svg>
  );
}

export function BusinessSubmissionPanel() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/business-submissions', { cache: 'no-store', credentials: 'same-origin' })
        .then((response) => response.ok ? response.json() : { submissions: [] }),
      fetch('/api/profile', { cache: 'no-store', credentials: 'same-origin' })
        .then((response) => response.ok ? response.json() : { profile: null }),
    ])
      .then(([submissionData, profileData]) => {
        if (!active) return;
        setSubmissions(submissionData.submissions || []);
        const profile = profileData.profile;
        if (profile) {
          setForm((current) => ({
            ...current,
            phone: profile.phone || '',
            village: allowedVillages.some((item) => item.name === profile.village) ? profile.village : '',
            locality: profile.locality || '',
          }));
        }
      })
      .catch(() => null)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const selectedVillage = useMemo(
    () => allowedVillages.find((village) => village.name === form.village),
    [form.village],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
    setMessage('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/business-submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر إرسال الطلب الآن.');

      const created = data.submission as Submission;
      setSubmissions((items) => [created, ...items]);
      setForm((current) => ({
        ...emptyForm,
        phone: current.phone,
        village: current.village,
        locality: current.locality,
      }));
      setMessage('تم إرسال النشاط للمراجعة بنجاح. لن يظهر في الدليل قبل اعتماد البيانات.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إرسال الطلب الآن.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="business-submission-panel" aria-labelledby="business-submission-title">
      <div className="business-submission-heading">
        <div className="business-submission-heading__icon"><PlusIcon /></div>
        <div>
          <span>ميزة العضو</span>
          <h2 id="business-submission-title">طلب إضافة نشاط</h2>
          <p>أرسل بيانات نشاط داخل مركز العسيرات، وسنحتفظ به كطلب مراجعة قبل إضافته إلى الدليل العام.</p>
        </div>
        <span className="business-submission-live">متاح الآن</span>
      </div>

      <form className="business-submission-form" onSubmit={submit}>
        <div className="business-submission-grid">
          <label>
            <span>اسم النشاط <b>*</b></span>
            <input value={form.businessName} onChange={(event) => update('businessName', event.target.value)} maxLength={120} placeholder="مثال: صيدلية الدكتور..." required />
          </label>

          <label>
            <span>القسم <b>*</b></span>
            <select value={form.category} onChange={(event) => update('category', event.target.value)} required>
              <option value="">اختر القسم</option>
              {allowedCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
          </label>

          <label>
            <span>التخصص أو الخدمة</span>
            <input value={form.subCategory} onChange={(event) => update('subCategory', event.target.value)} maxLength={120} placeholder="مثال: طبيب أطفال، كهربائي، سوبر ماركت" />
          </label>

          <label>
            <span>القرية <b>*</b></span>
            <select
              value={form.village}
              onChange={(event) => {
                setForm((current) => ({ ...current, village: event.target.value, locality: '' }));
                setError('');
                setMessage('');
              }}
              required
            >
              <option value="">اختر القرية</option>
              {allowedVillages.map((village) => <option key={village.slug} value={village.name}>{village.name}</option>)}
            </select>
          </label>

          <label>
            <span>التابع / النجع</span>
            <input
              value={form.locality}
              onChange={(event) => update('locality', event.target.value)}
              maxLength={100}
              placeholder="اختياري"
              list="business-localities"
              disabled={!form.village}
            />
            <datalist id="business-localities">
              {(selectedVillage?.localities || []).map((locality) => <option value={locality} key={locality} />)}
            </datalist>
          </label>

          <label className="business-submission-field--wide">
            <span>وصف الموقع داخل القرية <b>*</b></span>
            <input value={form.locationDetails} onChange={(event) => update('locationDetails', event.target.value)} maxLength={240} placeholder="مثال: شارع المستشفى بجوار..." required />
          </label>

          <label>
            <span>رقم الهاتف</span>
            <input dir="ltr" inputMode="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} maxLength={32} placeholder="01xxxxxxxxx" />
          </label>

          <label>
            <span>رقم واتساب</span>
            <input dir="ltr" inputMode="tel" value={form.whatsapp} onChange={(event) => update('whatsapp', event.target.value)} maxLength={32} placeholder="اختياري" />
          </label>

          <label>
            <span>مواعيد العمل</span>
            <input value={form.hours} onChange={(event) => update('hours', event.target.value)} maxLength={180} placeholder="مثال: يوميًا 9 ص - 10 م" />
          </label>

          <label>
            <span>رابط خرائط Google</span>
            <input dir="ltr" inputMode="url" value={form.googleMapsUrl} onChange={(event) => update('googleMapsUrl', event.target.value)} maxLength={500} placeholder="https://maps.app.goo.gl/..." />
          </label>

          <label className="business-submission-field--wide">
            <span>وصف مختصر للنشاط</span>
            <textarea value={form.description} onChange={(event) => update('description', event.target.value)} maxLength={800} rows={4} placeholder="اكتب الخدمات الأساسية أو أي معلومات مفيدة للمستخدمين." />
            <small>{form.description.length}/800</small>
          </label>
        </div>

        <div className="business-submission-form__note">
          <strong>مهم قبل الإرسال</strong>
          <p>الإرسال لا يعني النشر التلقائي. نراجع نطاق النشاط والبيانات والتكرار أولًا، وقد نطلب استكمال معلومات قبل الاعتماد.</p>
        </div>

        {error && <div className="business-submission-feedback is-error" role="alert">{error}</div>}
        {message && <div className="business-submission-feedback is-success" role="status">{message}</div>}

        <div className="business-submission-submit-row">
          <span>أضف هاتفًا أو واتساب أو رابط خرائط واحدًا على الأقل.</span>
          <button type="submit" disabled={saving}>{saving ? 'جاري إرسال الطلب…' : 'إرسال للمراجعة'}</button>
        </div>
      </form>

      <div className="member-submissions" aria-labelledby="member-submissions-title">
        <div className="member-submissions__heading">
          <div><span>متابعة الطلبات</span><h3 id="member-submissions-title">طلباتي المرسلة</h3></div>
          <span>{loading ? '...' : submissions.length}</span>
        </div>

        {loading ? (
          <div className="member-submissions__empty">جاري تحميل الطلبات…</div>
        ) : submissions.length ? (
          <div className="member-submissions__list">
            {submissions.map((submission) => {
              const status = statusInfo[submission.status];
              return (
                <article className="member-submission-item" key={submission.id}>
                  <div className="member-submission-item__main">
                    <div className="member-submission-item__title">
                      <h4>{submission.businessName}</h4>
                      <span className={`submission-status submission-status--${submission.status}`}>{status.label}</span>
                    </div>
                    <p>{submission.categoryLabel} · {submission.village}{submission.locality ? ` · ${submission.locality}` : ''}</p>
                    <small>{status.hint}</small>
                    {submission.reviewNote && <div className="submission-review-note"><strong>ملاحظة المراجعة:</strong> {submission.reviewNote}</div>}
                  </div>
                  <div className="member-submission-item__meta">
                    <span>أُرسل</span>
                    <b>{formatDate(submission.createdAt)}</b>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="member-submissions__empty">
            <strong>ما أرسلتش أنشطة للمراجعة حتى الآن</strong>
            <p>املأ النموذج بالأعلى، وبعد الإرسال هتقدر تتابع حالة الطلب من هنا.</p>
          </div>
        )}
      </div>
    </section>
  );
}
