import type { Metadata } from 'next';
import { DirectoryExplorer } from '@/components/directory-explorer';

export const metadata: Metadata = {
  title: 'الدليل الشامل لخدمات وأنشطة العسيرات',
  description: 'ابحث في دليل مركز العسيرات عن الأطباء والصيدليات والمحلات والحرفيين والمطاعم والمحامين والخدمات.',
  alternates: { canonical: '/directory' },
};

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  return (
    <main id="main-content" className="page-main">
      <section className="page-hero shell">
        <span className="eyebrow eyebrow--dark">البحث المركزي</span>
        <h1>الدليل الشامل لمركز العسيرات</h1>
        <p>ابحث بالاسم أو التخصص أو الخدمة أو القرية، ثم صفِّ النتائج حسب نطاقك.</p>
      </section>
      <section className="shell page-section">
        <DirectoryExplorer initialQuery={params.q || ''} />
      </section>
    </main>
  );
}
