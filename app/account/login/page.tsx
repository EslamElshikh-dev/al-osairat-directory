import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BrandMark } from '@/components/site-shell';
import { LoginForm } from '@/components/auth/auth-forms';

export const metadata: Metadata = { title: 'تسجيل الدخول', robots: { index: false, follow: false } };

export default function LoginPage() {
  if (!process.env.FIREBASE_WEB_API_KEY?.trim()) notFound();
  return (
    <main id="main-content" className="auth-page">
      <div className="shell auth-shell">
        <section className="auth-card" aria-labelledby="login-title">
          <Link href="/" className="auth-brand" aria-label="العودة إلى دليل العسيرات"><span><BrandMark /></span><div><strong>دليل العسيرات</strong><small>حساب الأعضاء</small></div></Link>
          <div className="auth-heading"><span className="auth-eyebrow">مرحبًا بعودتك</span><h1 id="login-title">تسجيل الدخول</h1><p>ادخل إلى حسابك واستعد لمزايا دليل العسيرات المخصصة للأعضاء.</p></div>
          <LoginForm />
        </section>
        <aside className="auth-side" aria-hidden="true"><span className="auth-side__mark"><BrandMark /></span><div><b>عضويتك في مكانك</b><h2>دليل محلي أقرب لأهل العسيرات.</h2><p>نبني العضويات لتكون أساسًا للمفضلة، المساهمات المحلية، وربط أصحاب الأنشطة بخدماتهم لاحقًا.</p></div></aside>
      </div>
    </main>
  );
}
