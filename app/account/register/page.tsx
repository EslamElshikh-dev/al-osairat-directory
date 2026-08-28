import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BrandMark } from '@/components/site-shell';
import { RegisterForm } from '@/components/auth/auth-forms';

export const metadata: Metadata = { title: 'إنشاء حساب', robots: { index: false, follow: false } };

export default function RegisterPage() {
  if (process.env.NEXT_PUBLIC_AUTH_ENABLED !== 'true') notFound();
  return (
    <main id="main-content" className="auth-page">
      <div className="shell auth-shell">
        <section className="auth-card" aria-labelledby="register-title">
          <Link href="/" className="auth-brand" aria-label="العودة إلى دليل العسيرات"><span><BrandMark /></span><div><strong>دليل العسيرات</strong><small>عضوية جديدة</small></div></Link>
          <div className="auth-heading"><span className="auth-eyebrow">انضم إلى الدليل</span><h1 id="register-title">إنشاء حساب عضو</h1><p>حساب بسيط وآمن باسمك وبريدك الإلكتروني، جاهز للمزايا القادمة.</p></div>
          <RegisterForm />
        </section>
        <aside className="auth-side auth-side--register" aria-hidden="true"><span className="auth-side__mark"><BrandMark /></span><div><b>ابدأ من هنا</b><h2>حساب واحد لكل ما يخصك في الدليل.</h2><p>نبدأ بالهوية الأساسية للعضو، ثم نبني فوقها المفضلة والمساهمات وخدمات أصحاب الأنشطة بدون إعادة تسجيل.</p></div></aside>
      </div>
    </main>
  );
}
