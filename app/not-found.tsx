import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'الصفحة غير موجودة',
  description: 'تعذر العثور على الصفحة المطلوبة في دليل العسيرات.',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main id="main-content" className="not-found shell">
      <span>404</span>
      <h1>الصفحة غير موجودة</h1>
      <p>ربما تغيّر الرابط أو أن السجل لم يعد منشورًا.</p>
      <Link href="/directory" className="button button--primary">العودة إلى الدليل</Link>
    </main>
  );
}
