'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { villages } from '@/lib/data/base';
import { validateBusinessSubmissionInput } from '@/lib/business-submission-validation';

const vehicleTypes = [
  'سيارة خاصة / تاكسي',
  'ميكروباص',
  'توك توك',
  'أتوبيس / نقل جماعي',
  'موتوسيكل توصيل',
  'وسيلة نقل أخرى',
];

const allowedVillages = villages.filter((village) => village.name !== 'مركز العسيرات');

type FormState = {
  businessName: string;
  category: 'transport';
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

const emptyForm: FormState = {
  businessName: '',
  category: 'transport',
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

export function TransportSubmissionForm() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [serviceAreas, setServiceAreas] = useState('');
  const [contactPublishConsent, setContactPublishConsent] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/profile', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : { profile: null })
      .then((data) => {
        if (!active || !data.profile) return;
        setForm((current) => ({
          ...current,
          phone: data.profile.phone || '',
          village: allowedVillages.some((item) => item.name === data.profile.village) ? data.profile.village : '',
          locality: data.profile.locality || '',
        }));
      })
      .catch(() => null)
      .finally(() => { if (active) setLoadingProfile(false); });
    return () => { active = false; };
  }, []);

  const selectedVillage = useMemo(
    () => allowedVillages.find((village) => village.name === form.village),
    [form.village],
  );
  const contactProvided = Boolean(form.phone.trim() || form.whatsapp.trim());

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
    setMessage('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!form.subCategory) {
      setError('اختر نوع المركبة أو وسيلة النقل.');
      return;
    }
    if (serviceAreas.trim().length < 3) {
      setError('اكتب خط السير أو المناطق التي تخدمها بشكل واضح.');
      return;
    }
    if (contactProvided && !contactPublishConsent) {
      setError('وافق على نشر رقم الاتصال أو واتساب قبل إرسال وسيلة تواصل عامة للخدمة.');
      return;
    }

    const payload = {
      ...form,
      contactPublishConsent,
      description: [
        `خط السير / مناطق الخدمة: ${serviceAreas.trim()}`,
        form.description.trim() ? `تفاصيل إضافية: ${form.description.trim()}` : '',
      ].filter(Boolean).join('\n'),
    };

    const validationError = validateBusinessSubmissionInput(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/business-submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر إرسال الطلب الآن.');

      setForm((current) => ({
        ...emptyForm,
        phone: current.phone,
        village: current.village,
        locality: current.locality,
      }));
      setServiceAreas('');
      setContactPublishConsent(false);
      setMessage('تم إرسال بيانات السائق أو وسيلة النقل للمراجعة. لن تظهر في الدليل قبل التحقق منها واعتمادها.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إرسال الطلب الآن.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="business-submission-panel transport-submission-panel" aria-labelledby="transport-submission-title">
      <div className="business-submission-heading">
        <div className="business-submission-heading__icon" aria-hidden="true">+</div>
        <div>
          <span>المواصلات المحلية</span>
          <h2 id="transport-submission-title">أضف سائقًا أو وسيلة مواصلات</h2>
          <p>أرسل بيانات خدمة نقل تعمل فعليًا داخل مركز العسيرات وقراه. كل طلب يمر بمراجعة قبل النشر.</p>
        </div>
        <span className="business-submission-live">مراجعة قبل النشر</span>
      </div>

      <form className="business-submission-form" onSubmit={submit}>
        <div className="business-submission-grid">
          <label>
            <span>اسم السائق أو اسم الخدمة <b>*</b></span>
            <input value={form.businessName} onChange={(event) => update('businessName', event.target.value)} minLength={2} maxLength={120} placeholder="مثال: أحمد - ميكروباص العسيرات / سوهاج" required />
          </label>

          <label>
            <span>نوع المركبة <b>*</b></span>
            <select value={form.subCategory} onChange={(event) => update('subCategory', event.target.value)} required>
              <option value="">اختر نوع المركبة</option>
              {vehicleTypes.map((type) => <option value={type} key={type}>{type}</option>)}
            </select>
          </label>

          <label>
            <span>القرية الأساسية <b>*</b></span>
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
              {allowedVillages.map((village) => <option value={village.name} key={village.slug}>{village.name}</option>)}
            </select>
          </label>

          <label>
            <span>التابع / النجع</span>
            <input value={form.locality} onChange={(event) => update('locality', event.target.value)} maxLength={100} list="transport-localities" disabled={!form.village} placeholder="اختياري" />
            <datalist id="transport-localities">
              {(selectedVillage?.localities || []).map((locality) => <option value={locality} key={locality} />)}
            </datalist>
          </label>

          <label className="business-submission-field--wide">
            <span>نقطة الانطلاق أو مكان التواجد <b>*</b></span>
            <input value={form.locationDetails} onChange={(event) => update('locationDetails', event.target.value)} minLength={3} maxLength={240} placeholder="مثال: موقف العسيرات - بجوار ..." required />
          </label>

          <label className="business-submission-field--wide">
            <span>خط السير / المناطق التي تخدمها <b>*</b></span>
            <input value={serviceAreas} onChange={(event) => { setServiceAreas(event.target.value); setError(''); setMessage(''); }} minLength={3} maxLength={300} placeholder="مثال: أولاد حمزة - العسيرات - سوهاج / جرجا / المنشأة" required />
            <small>اكتب القرى أو المدن التي يقبل السائق التوصيل إليها.</small>
          </label>

          <label>
            <span>رقم الاتصال</span>
            <input dir="ltr" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} maxLength={18} placeholder="01012345678" />
          </label>

          <label>
            <span>رقم واتساب</span>
            <input dir="ltr" inputMode="tel" autoComplete="tel" value={form.whatsapp} onChange={(event) => update('whatsapp', event.target.value)} maxLength={18} placeholder="01012345678" />
          </label>

          <label>
            <span>مواعيد الخدمة</span>
            <input value={form.hours} onChange={(event) => update('hours', event.target.value)} maxLength={180} placeholder="مثال: يوميًا 6 ص - 11 م" />
          </label>

          <label>
            <span>رابط خرائط Google</span>
            <input type="url" dir="ltr" inputMode="url" value={form.googleMapsUrl} onChange={(event) => update('googleMapsUrl', event.target.value)} maxLength={500} placeholder="https://maps.app.goo.gl/..." />
          </label>

          <label className="business-submission-field--wide">
            <span>تفاصيل إضافية</span>
            <textarea value={form.description} onChange={(event) => update('description', event.target.value)} maxLength={430} rows={4} placeholder="مثال: حجز مسبق، مشاوير خاصة، توصيل مستشفى، عدد المقاعد..." />
            <small>{form.description.length}/430</small>
          </label>
        </div>

        <label className="business-submission-consent">
          <input
            type="checkbox"
            checked={contactPublishConsent}
            onChange={(event) => {
              setContactPublishConsent(event.target.checked);
              setError('');
              setMessage('');
            }}
            required={contactProvided}
          />
          <span>
            <strong>موافقة نشر وسيلة التواصل</strong>
            <small>أوافق على نشر رقم الاتصال أو واتساب الذي أدخلته كوسيلة تواصل عامة لخدمة المواصلات. هذه الموافقة مطلوبة عند إضافة أي رقم.</small>
          </span>
        </label>

        <div className="business-submission-form__note">
          <strong>شروط النشر</strong>
          <p>يُقبل فقط رقم منشور للخدمة أو رقم يرسله صاحب الخدمة بنفسه، ويجب أن تكون الخدمة داخل نطاق مركز العسيرات وقراه. لا يتم نشر الطلب تلقائيًا.</p>
        </div>

        {error && <div className="business-submission-feedback is-error" role="alert">{error}</div>}
        {message && <div className="business-submission-feedback is-success" role="status">{message}</div>}

        <div className="business-submission-submit-row">
          <span>{loadingProfile ? 'جاري تجهيز النموذج…' : 'يلزم تسجيل الدخول وتأكيد البريد قبل الإرسال.'}</span>
          <button type="submit" disabled={saving}>{saving ? 'جاري إرسال الطلب…' : 'إرسال للمراجعة'}</button>
        </div>
      </form>

      <div className="business-submission-form__note">
        <strong>عندك حساب بالفعل؟</strong>
        <p>يمكنك متابعة حالة الطلبات من <Link href="/account#business-submissions">مساحة العضو</Link>.</p>
      </div>
    </section>
  );
}
