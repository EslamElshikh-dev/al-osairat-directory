import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DirectoryExplorer } from '@/components/directory-explorer';
import { categories, categoryById, type DirectoryCategory } from '@/lib/data';
import { siteConfig } from '@/lib/site';

export function generateStaticParams() {
  return categories.map((category) => ({ category: category.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const info = categoryById[category as DirectoryCategory];
  if (!info) return {};
  return {
    title: `${info.label} في العسيرات`,
    description: info.description,
    alternates: { canonical: `/directory/${info.id}` },
    openGraph: { title: `${info.label} في العسيرات`, description: info.description, url: `${siteConfig.url}/directory/${info.id}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { category } = await params;
  const query = await searchParams;
  const info = categoryById[category as DirectoryCategory];
  if (!info) notFound();

  return (
    <main id="main-content" className="page-main">
      <section className="page-hero shell">
        <span className="eyebrow eyebrow--dark">قسم متخصص</span>
        <h1>{info.label} في العسيرات</h1>
        <p>{info.description}</p>
      </section>
      <section className="shell page-section">
        <DirectoryExplorer category={info.id} initialQuery={query.q || ''} />
      </section>
    </main>
  );
}
