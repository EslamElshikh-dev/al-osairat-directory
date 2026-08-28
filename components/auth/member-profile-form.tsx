'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { villages } from '@/lib/data/base';

export type EditableMemberProfile = {
  fullName: string;
  avatarUrl: string;
  phone: string;
  village: string;
  locality: string;
  email: string;
  updatedAt: string | null;
};

export function MemberProfileForm({ onSaved }: { onSaved?: (profile: EditableMemberProfile) => void }) {
  const [profile, setProfile] = useState<EditableMemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/profile', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'تعذر تحميل بيانات العضو.');
        return data;
      })
      .then((data) => { if (active) setProfile(data.profile); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'تعذر تحميل بيانات العضو.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const selectedVillage = useMemo(
    () => villages.find((item) => item.name === profile?.village),
    [profile?.village],
  );

  function update<K extends keyof EditableMemberProfile>(key: K, value: EditableMemberProfile[K]) {
    setProfile((current) => current ? { ...current, [key]: value } : current);
    setMessage('');
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || saving) return;

    const fullName = profile.fullName.trim().replace(/\s+/g, ' ');
    if (fullName.length < 2) {
      setError('اكتب الاسم الكامل بشكل صحيح.');
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          fullName,
          phone: profile.phone,
          village: profile.village,
          locality: profile.locality,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'تعذر حفظ البيانات.');

      setProfile(data.profile);
      setMessage('تم حفظ بياناتك بنجاح.');
      onSaved?.(data.profile);
      window.dispatchEvent(new CustomEvent('member:profile-updated', {
        detail: { displayName: data.profile.fullName, avatarUrl: data.profile.avatarUrl },
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر حفظ البيانات.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="member-profile-card"><div className="member-profile-loading">جاري تحميل بيانات العضو…</div></section>;
  }

  if (!profile) {
    return <section className="member-profile-card"><div className="member-profile-error">{error || 'تعذر تحميل بيانات العضو.'}</div></section>;
  }

  return (
    <section className="member-profile-card" aria-labelledby="member-profile-title">
      <div className="member-profile-heading">
        <div>
          <span>بيانات العضو</span>
          <h2 id="member-profile-title">ملفك الشخصي في دليل العسيرات</h2>
          <p>هذه البيانات خاصة بحسابك ولا تعدّل أي سجل تجاري أو خدمة منشورة في الدليل.</p>
        </div>
        <div className={`member-profile-avatar${profile.avatarUrl ? ' has-photo' : ''}`} aria-label="صورة الحساب الحالية">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span aria-hidden="true">{profile.fullName.trim().charAt(0) || 'ع'}</span>
          )}
          <small>{profile.avatarUrl ? 'صورة Google' : 'صورة الحساب'}</small>
        </div>
      </div>

      <form className="member-profile-form" onSubmit={submit}>
        <div className="member-profile-field member-profile-field--wide">
          <label htmlFor="member-full-name">الاسم الكامل</label>
          <input
            id="member-full-name"
            value={profile.fullName}
            onChange={(event) => update('fullName', event.target.value)}
            autoComplete="name"
            maxLength={80}
            required
          />
        </div>

        <div className="member-profile-field">
          <label htmlFor="member-email">البريد الإلكتروني</label>
          <input id="member-email" value={profile.email} readOnly disabled dir="ltr" />
          <small>البريد مرتبط بطريقة تسجيل الدخول ولا يتم تغييره من هنا.</small>
        </div>

        <div className="member-profile-field">
          <label htmlFor="member-phone">رقم الجوال <span>اختياري</span></label>
          <input
            id="member-phone"
            value={profile.phone}
            onChange={(event) => update('phone', event.target.value)}
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="01012345678 أو +201012345678"
            maxLength={24}
          />
        </div>

        <div className="member-profile-field">
          <label htmlFor="member-village">القرية <span>اختياري</span></label>
          <select
            id="member-village"
            value={profile.village}
            onChange={(event) => {
              update('village', event.target.value);
              setProfile((current) => current ? { ...current, village: event.target.value, locality: '' } : current);
            }}
          >
            <option value="">غير محدد</option>
            {villages.filter((item) => item.name !== 'مركز العسيرات').map((item) => (
              <option value={item.name} key={item.slug}>{item.name}</option>
            ))}
          </select>
        </div>

        <div className="member-profile-field">
          <label htmlFor="member-locality">التابع / النجع <span>اختياري</span></label>
          <input
            id="member-locality"
            value={profile.locality}
            onChange={(event) => update('locality', event.target.value)}
            list="member-localities"
            disabled={!profile.village}
            placeholder={profile.village ? 'اكتب أو اختر التابع' : 'اختر القرية أولًا'}
            maxLength={100}
          />
          <datalist id="member-localities">
            {(selectedVillage?.localities || []).map((locality) => <option value={locality} key={locality} />)}
          </datalist>
        </div>

        <div className="member-profile-form-footer">
          <div className="member-profile-feedback" aria-live="polite">
            {error ? <span className="is-error">{error}</span> : message ? <span className="is-success">{message}</span> : <span>يمكنك تعديل البيانات في أي وقت.</span>}
          </div>
          <button type="submit" disabled={saving}>{saving ? 'جاري الحفظ…' : 'حفظ التعديلات'}</button>
        </div>
      </form>
    </section>
  );
}
