import type { MetadataRoute } from 'next';
import { categories, listings, villages } from '@/lib/data';
import { blogArticles } from '@/lib/blog';
import { mergeDirectoryListings } from '@/lib/directory-query';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
import { getEligibleServiceIntents, getEligibleVillageCategoryLandings, villageCategoryLandingPath } from '@/lib/programmatic-seo';
import { isListingIndexable, listingSitemapPriority } from '@/lib/seo-growth';
import { siteConfig } from '@/lib/site';

type SitemapEntry = MetadataRoute.Sitemap[number];

const absoluteUrl = (path = '') => `${siteConfig.url}${path}`;
const encodedSegment = (value: string) => encodeURIComponent(value);

function latestListingUpdate(items: typeof listings) {
  const dates = items.map((listing) => listing.lastUpdatedAt).filter((value): value is string => Boolean(value)).sort();
  return dates.at(-1);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [publishedListings, baseListings] = await Promise.all([
    getPublishedListings(),
    applyListingOverrides(listings),
  ]);
  const allListings = mergeDirectoryListings(baseListings, publishedListings);
  const staticDetailListings = baseListings.filter((listing) => listing.category !== 'emergency' && isListingIndexable(listing));
  const eligibleServiceIntents = getEligibleServiceIntents(allListings);
  const eligibleLocalLandings = getEligibleVillageCategoryLandings(allListings);

  const staticPages: SitemapEntry[] = [
    { url: absoluteUrl(), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/directory'), changeFrequency: 'weekly', priority: 0.95 },
    { url: absoluteUrl('/blog'), changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/villages'), changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/services'), changeFrequency: 'weekly', priority: 0.84 },
    { url: absoluteUrl('/emergency'), changeFrequency: 'monthly', priority: 0.8 },
  ];

  const categoryPages: SitemapEntry[] = categories
    .filter((category) => category.id !== 'emergency')
    .map((category) => ({
      url: absoluteUrl(`/directory/${category.id}`),
      changeFrequency: 'weekly',
      priority: category.id === 'doctors' || category.id === 'pharmacies' ? 0.9 : 0.85,
    }));

  const villagePages: SitemapEntry[] = villages
    .filter((village) => village.name !== 'مركز العسيرات')
    .map((village) => ({
      url: absoluteUrl(`/villages/${encodedSegment(village.slug)}`),
      changeFrequency: 'weekly',
      priority: 0.85,
    }));

  const servicePages: SitemapEntry[] = eligibleServiceIntents.map(({ intent, listings: matched }) => ({
    url: absoluteUrl(`/services/${intent.id}`),
    ...(latestListingUpdate(matched) ? { lastModified: latestListingUpdate(matched) } : {}),
    changeFrequency: 'weekly',
    priority: Math.min(0.88, Number((0.8 + Math.min(matched.length, 12) / 150).toFixed(2))),
  }));

  const localLandingPages: SitemapEntry[] = eligibleLocalLandings
    .filter(({ village }) => village.name !== 'مركز العسيرات')
    .map(({ village, category, listings: matched, averageQuality }) => ({
      url: absoluteUrl(villageCategoryLandingPath(village, category)),
      ...(latestListingUpdate(matched) ? { lastModified: latestListingUpdate(matched) } : {}),
      changeFrequency: 'weekly',
      priority: Math.min(0.87, Number((0.72 + Math.min(matched.length, 12) / 160 + averageQuality / 1000).toFixed(2))),
    }));

  const articlePages: SitemapEntry[] = blogArticles.map((article) => ({
    url: absoluteUrl(`/blog/${article.slug}`),
    lastModified: article.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.85,
  }));

  const staticListingPages: SitemapEntry[] = staticDetailListings.map((listing) => ({
    url: absoluteUrl(`/listing/${encodedSegment(listing.slug)}`),
    ...(listing.lastUpdatedAt ? { lastModified: listing.lastUpdatedAt } : {}),
    changeFrequency: 'monthly',
    priority: listingSitemapPriority(listing),
  }));

  const publishedListingPages: SitemapEntry[] = publishedListings
    .filter(isListingIndexable)
    .map((listing) => ({
      url: absoluteUrl(`/listing/${encodedSegment(listing.slug)}`),
      lastModified: listing.lastUpdatedAt || listing.publishedAt,
      changeFrequency: 'monthly',
      priority: listingSitemapPriority(listing),
    }));

  const entries = [
    ...staticPages,
    ...categoryPages,
    ...villagePages,
    ...servicePages,
    ...localLandingPages,
    ...articlePages,
    ...staticListingPages,
    ...publishedListingPages,
  ];

  // Keep the sitemap deterministic, quality-gated and protected from duplicate or thin programmatic URLs.
  return Array.from(new Map(entries.map((entry) => [entry.url, entry])).values());
}
