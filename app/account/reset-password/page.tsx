import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark } from '@/components/site-shell';
import { ResetPasswordForm } from '@/components/auth/auth-forms';

export const metadata: Metadata = { title: 'تعيين كلمة مرور جديدة', robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return (
    <main id="main-content" className="auth-page auth-page--compact">
      <div className="shell auth-shell auth-shell--single">
        <section className="auth-card" aria-labelledby="reset-title">
          <Link href="/" className="auth-brand" aria-label="العودة إلى دليل العسيرات"><span><BrandMark /></span><div><strong>دليل العسيرات</strong><small>تحديث كلمة المرور</small></div></Link>
          <div className="auth-heading"><span className="auth-eyebrow">خطوة أخيرة</span><h1 id="reset-title">تعيين كلمة مرور جديدة</h1><p>اكتب كلمة مرور قوية جديدة لحسابك.</p></div>
          <ResetPasswordForm />
        </section>
      </div>
    </main>
  );
}
