import { NextResponse } from 'next/server';
import { blogArticles } from '@/lib/blog-published';
import { categories, categoryById, listings, villages } from '@/lib/data';
import {
  canonicalizeDirectoryQuery,
  mergeDirectoryListings,
  queryDirectoryListings,
} from '@/lib/directory-query';
import { queryCanonicalDirectory } from '@/lib/directory-repository';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
import { isFallbackScope } from '@/lib/seo-growth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SearchItem = {
  kind: 'listing' | 'category' | 'village' | 'article' | 'page';
  title: string;
  subtitle: string;
  href: string;
  badge: string;
};

const corePages = [
  { title: 'الدليل الشامل', subtitle: 'كل الأنشطة والخدمات داخل مركز العسيرات', href: '/directory', badge: 'صفحة' },
  { title: 'قرى العسيرات', subtitle: 'تصفح القرى الأساسية والتوابع', href: '/villages', badge: 'صفحة' },
  { title: 'مدونة العسيرات', subtitle: 'مقالات ومحتوى محلي عن المركز وقراه', href: '/blog', badge: 'صفحة' },
  { title: 'أرقام الطوارئ', subtitle: 'أرقام الطوارئ والخدمات المهمة', href: '/emergency', badge: 'خدمة' },
  { title: 'الخدمات المتخصصة', subtitle: 'صفحات بحث متخصصة ببيانات كافية', href: '/services', badge: 'صفحة' },
];

function searchable(...values: Array<string | undefined>) {
  return canonicalizeDirectoryQuery(values.filter(Boolean).join(' '));
}

function relevance(value: string, normalizedQuery: string) {
  if (!value || !normalizedQuery) return 0;
  if (value === normalizedQuery) return 100;
  if (value.startsWith(normalizedQuery)) return 80;
  if (value.includes(normalizedQuery)) return 60;
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const matched = tokens.filter((token) => value.includes(token)).length;
  return matched ? Math.round((matched / tokens.length) * 45) : 0;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = String(url.searchParams.get('q') || '').trim().slice(0, 100);
  const normalizedQuery = canonicalizeDirectoryQuery(query);

  if (normalizedQuery.length < 2) {
    return NextResponse.json({ query, items: [], total: 0 });
  }

  try {
    const canonicalResult = await queryCanonicalDirectory({ query, page: 1 });
    let listingItems = canonicalResult?.items;

    if (!listingItems) {
      const [publishedListings, baseListings] = await Promise.all([
        getPublishedListings(),
        applyListingOverrides(listings),
      ]);
      const allListings = mergeDirectoryListings(baseListings, publishedListings);
      listingItems = queryDirectoryListings(allListings, { query, page: 1 }).items;
    }

    const listingResults: SearchItem[] = listingItems.slice(0, 7).map((listing) => ({
      kind: 'listing',
      title: listing.title,
      subtitle: [listing.subCategory, listing.village].filter(Boolean).join(' · ') || listing.location,
      href: `/listing/${encodeURIComponent(listing.slug)}`,
      badge: categoryById[listing.category]?.shortLabel || 'نشاط',
    }));

    const navigationCandidates: Array<{ score: number; item: SearchItem }> = [];

    for (const category of categories) {
      const score = relevance(searchable(category.label, category.shortLabel, category.description), normalizedQuery);
      if (score) navigationCandidates.push({
        score: score + 8,
        item: {
          kind: 'category',
          title: category.label,
          subtitle: category.description,
          href: `/directory/${category.id}`,
          badge: 'قسم',
        },
      });
    }

    for (const village of villages.filter((item) => !isFallbackScope(item.name))) {
      const score = relevance(searchable(village.name, village.description, ...village.localities), normalizedQuery);
      if (score) navigationCandidates.push({
        score: score + 6,
        item: {
          kind: 'village',
          title: `دليل ${village.name}`,
          subtitle: village.description,
          href: `/villages/${encodeURIComponent(village.slug)}`,
          badge: 'قرية',
        },
      });
    }

    for (const article of blogArticles) {
      const sectionContent = article.sections.flatMap((section) => [
        section.heading,
        ...section.paragraphs,
        ...(section.bullets ?? []),
        ...(section.entries?.flatMap((entry) => [entry.name, entry.description]) ?? []),
      ]).join(' ');
      const score = relevance(searchable(article.title, article.seoTitle, article.description, article.category, article.eyebrow, sectionContent), normalizedQuery);
      if (score) navigationCandidates.push({
        score,
        item: {
          kind: 'article',
          title: article.title,
          subtitle: article.description,
          href: `/blog/${article.slug}`,
          badge: 'مقال',
        },
      });
    }

    for (const page of corePages) {
      const score = relevance(searchable(page.title, page.subtitle), normalizedQuery);
      if (score) navigationCandidates.push({
        score,
        item: { kind: 'page', ...page },
      });
    }

    const seen = new Set(listingResults.map((item) => item.href));
    const navigationResults = navigationCandidates
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'ar'))
      .map(({ item }) => item)
      .filter((item) => {
        if (seen.has(item.href)) return false;
        seen.add(item.href);
        return true;
      })
      .slice(0, 5);

    const items = [...listingResults, ...navigationResults].slice(0, 10);
    return NextResponse.json({ query, items, total: items.length });
  } catch {
    return NextResponse.json({ error: 'تعذر تنفيذ البحث الآن.' }, { status: 500 });
  }
}
