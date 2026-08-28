import Link from 'next/link';

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
