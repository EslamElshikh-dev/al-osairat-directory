import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DirectoryExplorer } from '@/components/directory-explorer';
import { categories, categoryById, listings, type DirectoryCategory } from '@/lib/data';
import { mergeDirectoryListings, queryDirectoryListings } from '@/lib/directory-query';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
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

export const dynamic = 'force-dynamic';

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ q?: string; village?: string; page?: string }>;
}) {
  const { category } = await params;
  const query = await searchParams;
  const info = categoryById[category as DirectoryCategory];
  if (!info) notFound();

  const [publishedListings, baseListings] = await Promise.all([
    getPublishedListings({ category: info.id }),
    applyListingOverrides(listings),
  ]);

  const allListings = mergeDirectoryListings(baseListings, publishedListings);
  const result = queryDirectoryListings(allListings, {
    category: info.id,
    query: query.q,
    village: query.village,
    page: Number(query.page || 1),
  });
  const pathname = `/directory/${info.id}`;

  return (
    <main id="main-content" className="page-main">
      <section className="page-hero shell">
        <span className="eyebrow eyebrow--dark">قسم متخصص</span>
        <h1>{info.label} في العسيرات</h1>
        <p>{info.description}</p>
      </section>
      <section className="shell page-section">
        <DirectoryExplorer
          category={info.id}
          query={query.q || ''}
          village={query.village || 'all'}
          result={result}
          pathname={pathname}
        />
      </section>
    </main>
  );
}
