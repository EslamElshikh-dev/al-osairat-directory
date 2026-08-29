'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { evaluatePassword, PASSWORD_MIN_LENGTH, passwordPolicyError } from '@/lib/auth/password-policy';

type ApiResult = { error?: string; verificationSent?: boolean };

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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.35Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.9A6.01 6.01 0 0 1 6.08 12c0-.66.11-1.3.31-1.9V7.5H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.5l3.35-2.6Z" />
      <path fill="#EA4335" d="M12 5.97c1.47 0 2.79.51 3.83 1.5l2.87-2.88C16.96 2.97 14.7 2 12 2a10 10 0 0 0-8.96 5.5l3.35 2.6C7.18 7.73 9.39 5.97 12 5.97Z" />
    </svg>
  );
}

function SocialAuth() {
  return (
    <>
      <a className="auth-google" href="/api/auth/google">
        <span className="auth-google__icon"><GoogleIcon /></span>
        <span>المتابعة باستخدام Google</span>
      </a>
      <div className="auth-divider" aria-hidden="true"><span>أو</span></div>
    </>
  );
}

function PasswordStrength({ password, id }: { password: string; id: string }) {
  const result = evaluatePassword(password);
  const requirementItems = [
    { met: result.requirements.length, text: `${PASSWORD_MIN_LENGTH} أحرف أو أكثر` },
    { met: result.requirements.letter, text: 'حرف واحد على الأقل' },
    { met: result.requirements.number, text: 'رقم واحد على الأقل' },
    { met: result.requirements.uncommon, text: 'ليست كلمة مرور شائعة' },
  ];

  return (
    <div className="password-strength" id={id} aria-live="polite">
      <div className="password-strength__head">
        <span>قوة كلمة المرور</span>
        <b className={`password-strength__label password-strength__label--${result.score}`}>
          {password ? result.label : 'ابدأ بالكتابة'}
        </b>
      </div>
      <div className="password-strength__meter" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => <span key={step} className={step <= result.score ? 'is-active' : ''} />)}
      </div>
      <div className="password-strength__requirements">
        {requirementItems.map((item) => (
          <span key={item.text} className={item.met ? 'is-met' : ''}>
            <i aria-hidden="true">{item.met ? '✓' : '○'}</i>{item.text}
          </span>
        ))}
      </div>
      <p className="password-strength__tip">لأقصى قوة: استخدم 12 حرفًا أو أكثر وأضف رمزًا خاصًا، ولا تعِد استخدام نفس كلمة المرور في مواقع أخرى.</p>
    </div>
  );
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
    <div className="auth-form-stack">
      <SocialAuth />
      <form className="auth-form" onSubmit={onSubmit}>
        <div className="auth-field"><label htmlFor="login-email">البريد الإلكتروني</label><input id="login-email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="name@example.com" /></div>
        <div className="auth-field"><div className="auth-field__row"><label htmlFor="login-password">كلمة المرور</label><Link href="/account/forgot-password">نسيت كلمة المرور؟</Link></div><input id="login-password" name="password" type="password" autoComplete="current-password" required minLength={8} placeholder="••••••••" /></div>
        {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'جاري الدخول…' : 'تسجيل الدخول'}</button>
        <p className="auth-switch">ليس لديك حساب؟ <Link href="/account/register">أنشئ حسابًا جديدًا</Link></p>
      </form>
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const policyError = passwordPolicyError(password);
    if (policyError) { setError(policyError); return; }
    if (password !== confirmPassword) { setError('تأكيد كلمة المرور غير مطابق.'); return; }
    if (!form.get('consent')) { setError('يلزم الموافقة على استخدام بيانات الحساب لتشغيل العضوية.'); return; }
    setBusy(true); setError('');
    try {
      const result = await submitAuth('/api/auth/register', {
        name: String(form.get('name') || ''),
        email: String(form.get('email') || ''),
        password,
      });
      if (result.verificationSent) {
        setVerificationSent(true);
        setBusy(false);
      } else {
        router.replace('/account');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إنشاء الحساب.');
      setBusy(false);
    }
  }

  if (verificationSent) return <div className="auth-success"><strong>تم إنشاء حسابك</strong><p>أرسلنا رابط تأكيد إلى بريدك الإلكتروني. افتح الرسالة واضغط رابط التأكيد، ثم سجّل الدخول.</p><Link href="/account/login">الذهاب إلى تسجيل الدخول</Link></div>;

  return (
    <div className="auth-form-stack">
      <SocialAuth />
      <form className="auth-form" onSubmit={onSubmit}>
        <div className="auth-field"><label htmlFor="register-name">الاسم</label><input id="register-name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={80} placeholder="اسمك كما تحب أن يظهر" /></div>
        <div className="auth-field"><label htmlFor="register-email">البريد الإلكتروني</label><input id="register-email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="name@example.com" /></div>
        <div className="auth-field">
          <label htmlFor="register-password">كلمة المرور</label>
          <input id="register-password" name="password" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby="register-password-strength" placeholder={`${PASSWORD_MIN_LENGTH} أحرف + حرف ورقم`} />
          <PasswordStrength password={password} id="register-password-strength" />
        </div>
        <div className="auth-field">
          <label htmlFor="register-confirm">تأكيد كلمة المرور</label>
          <input id="register-confirm" name="confirmPassword" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="أعد كتابة كلمة المرور" />
          {confirmPassword && <small className={`password-match ${password === confirmPassword ? 'is-match' : 'is-mismatch'}`}>{password === confirmPassword ? '✓ كلمتا المرور متطابقتان' : 'كلمتا المرور غير متطابقتين بعد'}</small>}
        </div>
        <label className="auth-consent"><input name="consent" type="checkbox" value="yes" required /><span>أوافق على استخدام الاسم والبريد وبيانات الجلسة اللازمة لتشغيل عضويتي في دليل العسيرات.</span></label>
        {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'جاري إنشاء الحساب…' : 'إنشاء الحساب'}</button>
        <p className="auth-switch">لديك حساب بالفعل؟ <Link href="/account/login">تسجيل الدخول</Link></p>
      </form>
    </div>
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

export function ResetPasswordForm() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    setAccessToken(hash.get('access_token') || '');
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) { setError('رابط الاستعادة غير صالح أو انتهت صلاحيته.'); return; }
    const policyError = passwordPolicyError(password);
    if (policyError) { setError(policyError); return; }
    if (password !== confirmPassword) { setError('تأكيد كلمة المرور غير مطابق.'); return; }
    setBusy(true); setError('');
    try {
      await submitAuth('/api/auth/reset-password', { accessToken, password });
      router.replace('/account/login?reset=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحديث كلمة المرور.');
      setBusy(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <div className="auth-field">
        <label htmlFor="reset-password">كلمة المرور الجديدة</label>
        <input id="reset-password" name="password" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby="reset-password-strength" placeholder={`${PASSWORD_MIN_LENGTH} أحرف + حرف ورقم`} />
        <PasswordStrength password={password} id="reset-password-strength" />
      </div>
      <div className="auth-field">
        <label htmlFor="reset-confirm">تأكيد كلمة المرور</label>
        <input id="reset-confirm" name="confirmPassword" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="أعد كتابة كلمة المرور" />
        {confirmPassword && <small className={`password-match ${password === confirmPassword ? 'is-match' : 'is-mismatch'}`}>{password === confirmPassword ? '✓ كلمتا المرور متطابقتان' : 'كلمتا المرور غير متطابقتين بعد'}</small>}
      </div>
      {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
      <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'جاري الحفظ…' : 'حفظ كلمة المرور الجديدة'}</button>
    </form>
  );
}
