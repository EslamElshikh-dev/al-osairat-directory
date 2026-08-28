import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BrandMark } from '@/components/site-shell';
import { ForgotPasswordForm } from '@/components/auth/auth-forms';

export const metadata: Metadata = { title: 'استعادة كلمة المرور', robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  if (process.env.NEXT_PUBLIC_AUTH_ENABLED !== 'true') notFound();
  return (
    <main id="main-content" className="auth-page auth-page--compact">
      <div className="shell auth-shell auth-shell--single">
        <section className="auth-card" aria-labelledby="forgot-title">
          <Link href="/" className="auth-brand" aria-label="العودة إلى دليل العسيرات"><span><BrandMark /></span><div><strong>دليل العسيرات</strong><small>استعادة الحساب</small></div></Link>
          <div className="auth-heading"><span className="auth-eyebrow">استعادة آمنة</span><h1 id="forgot-title">نسيت كلمة المرور؟</h1><p>أدخل بريدك، وسنرسل تعليمات الاستعادة إذا كان مرتبطًا بحساب.</p></div>
          <ForgotPasswordForm />
        </section>
      </div>
    </main>
  );
}
