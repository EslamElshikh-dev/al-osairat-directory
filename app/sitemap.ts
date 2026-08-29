import type { MetadataRoute } from 'next';
import { categories, listings, villages } from '@/lib/data';
import { blogArticles } from '@/lib/blog';
import { getPublishedListings } from '@/lib/published-listings';
import { listingSitemapPriority } from '@/lib/seo-growth';
import { siteConfig } from '@/lib/site';

type SitemapEntry = MetadataRoute.Sitemap[number];

const absoluteUrl = (path = '') => `${siteConfig.url}${path}`;
const encodedSegment = (value: string) => encodeURIComponent(value);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publishedListings = await getPublishedListings();
  const staticDetailListings = listings.filter((listing) => listing.category !== 'emergency');

  const staticPages: SitemapEntry[] = [
    { url: absoluteUrl(), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/directory'), changeFrequency: 'weekly', priority: 0.95 },
    { url: absoluteUrl('/blog'), changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/villages'), changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/emergency'), changeFrequency: 'monthly', priority: 0.8 },
  ];

  const categoryPages: SitemapEntry[] = categories
    .filter((category) => category.id !== 'emergency')
    .map((category) => ({
      url: absoluteUrl(`/directory/${category.id}`),
      changeFrequency: 'weekly',
      priority: category.id === 'doctors' || category.id === 'pharmacies' ? 0.9 : 0.85,
    }));

  const villagePages: SitemapEntry[] = villages.map((village) => ({
    url: absoluteUrl(`/villages/${encodedSegment(village.slug)}`),
    changeFrequency: 'weekly',
    priority: village.name === 'مركز العسيرات' ? 0.72 : 0.85,
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
    changeFrequency: listing.sourceStatus === 'needs_review' ? 'yearly' : 'monthly',
    priority: listingSitemapPriority(listing),
  }));

  const publishedListingPages: SitemapEntry[] = publishedListings.map((listing) => ({
    url: absoluteUrl(`/listing/${encodedSegment(listing.slug)}`),
    lastModified: listing.lastUpdatedAt || listing.publishedAt,
    changeFrequency: 'monthly',
    priority: listingSitemapPriority(listing),
  }));

  const entries = [
    ...staticPages,
    ...categoryPages,
    ...villagePages,
    ...articlePages,
    ...staticListingPages,
    ...publishedListingPages,
  ];

  // Keep the sitemap deterministic, quality-aware and protected from accidental duplicate URLs.
  return Array.from(new Map(entries.map((entry) => [entry.url, entry])).values());
}
