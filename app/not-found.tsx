import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark } from '@/components/site-shell';

export const metadata: Metadata = {
  title: 'الصفحة غير موجودة',
  description: 'تعذر العثور على الصفحة المطلوبة في دليل العسيرات.',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main id="main-content" className="not-found-page not-found-page--vnext2">
      <div className="shell not-found-page__shell">
        <section className="not-found-card">
          <div className="not-found-card__mark" aria-hidden="true"><BrandMark /></div>
          <span className="not-found-card__code">404 · الطريق ده مش موجود في الدليل</span>
          <h1>شكل الرابط لفّ منك في نجع تاني 😄</h1>
          <p>ممكن الصفحة اتنقلت أو السجل ما بقاش منشور. بدل ما نقف في آخر الطريق، اختار أقرب مسار ونكمّل.</p>

          <nav className="not-found-card__routes" aria-label="مسارات بديلة في دليل العسيرات">
            <Link href="/directory"><span>الخدمات والأنشطة</span><b>افتح الدليل ←</b></Link>
            <Link href="/villages"><span>حسب المكان</span><b>استكشف القرى ←</b></Link>
            <Link href="/news"><span>آخر المستجدات</span><b>أخبار العسيرات ←</b></Link>
            <Link href="/blog"><span>المكان والناس</span><b>اقرأ المدونة ←</b></Link>
          </nav>

          <Link href="/" className="button button--primary not-found-card__home">العودة للرئيسية</Link>
        </section>
      </div>
    </main>
  );
}
