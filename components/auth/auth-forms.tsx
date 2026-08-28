'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type ApiResult = { error?: string };

async function submitAuth(path: string, payload: Record<string, string>) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({})) as ApiResult;
  if (!response.ok) throw new Error(data.error || 'تعذر إتمام العملية.');
  return data;
}

export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      await submitAuth('/api/auth/login', {
        email: String(form.get('email') || ''),
        password: String(form.get('password') || ''),
      });
      router.replace('/account');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول.');
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <div className="auth-field">
        <label htmlFor="login-email">البريد الإلكتروني</label>
        <input id="login-email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="name@example.com" />
      </div>
      <div className="auth-field">
        <div className="auth-field__row"><label htmlFor="login-password">كلمة المرور</label><Link href="/account/forgot-password">نسيت كلمة المرور؟</Link></div>
        <input id="login-password" name="password" type="password" autoComplete="current-password" required minLength={8} placeholder="••••••••" />
      </div>
      {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
      <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'جاري الدخول…' : 'تسجيل الدخول'}</button>
      <p className="auth-switch">ليس لديك حساب؟ <Link href="/account/register">أنشئ حسابًا جديدًا</Link></p>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    const confirm = String(form.get('confirmPassword') || '');
    if (password !== confirm) { setError('تأكيد كلمة المرور غير مطابق.'); return; }
    if (!form.get('consent')) { setError('يلزم الموافقة على استخدام بيانات الحساب لتشغيل العضوية.'); return; }

    setBusy(true); setError('');
    try {
      await submitAuth('/api/auth/register', {
        name: String(form.get('name') || ''),
        email: String(form.get('email') || ''),
        password,
      });
      router.replace('/account');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إنشاء الحساب.');
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <div className="auth-field"><label htmlFor="register-name">الاسم</label><input id="register-name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={80} placeholder="اسمك كما تحب أن يظهر" /></div>
      <div className="auth-field"><label htmlFor="register-email">البريد الإلكتروني</label><input id="register-email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="name@example.com" /></div>
      <div className="auth-field"><label htmlFor="register-password">كلمة المرور</label><input id="register-password" name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="8 أحرف على الأقل" /><small>استخدم كلمة مرور قوية لا تقل عن 8 أحرف.</small></div>
      <div className="auth-field"><label htmlFor="register-confirm">تأكيد كلمة المرور</label><input id="register-confirm" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} placeholder="أعد كتابة كلمة المرور" /></div>
      <label className="auth-consent"><input name="consent" type="checkbox" value="yes" required /><span>أوافق على استخدام الاسم والبريد وبيانات الجلسة اللازمة لتشغيل عضويتي في دليل العسيرات.</span></label>
      {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
      <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'جاري إنشاء الحساب…' : 'إنشاء الحساب'}</button>
      <p className="auth-switch">لديك حساب بالفعل؟ <Link href="/account/login">تسجيل الدخول</Link></p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      await submitAuth('/api/auth/forgot-password', { email: String(form.get('email') || '') });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إرسال الطلب.');
    } finally { setBusy(false); }
  }

  if (sent) return <div className="auth-success"><strong>راجع بريدك الإلكتروني</strong><p>إذا كان البريد مرتبطًا بحساب، ستصلك رسالة لإعادة تعيين كلمة المرور.</p><Link href="/account/login">العودة لتسجيل الدخول</Link></div>;

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <div className="auth-field"><label htmlFor="forgot-email">البريد الإلكتروني</label><input id="forgot-email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="name@example.com" /></div>
      {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
      <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'جاري الإرسال…' : 'إرسال رابط الاستعادة'}</button>
      <p className="auth-switch"><Link href="/account/login">العودة لتسجيل الدخول</Link></p>
    </form>
  );
}
