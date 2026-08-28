import type { MetadataRoute } from 'next';
import { categories, listings, villages } from '@/lib/data';
import { siteConfig } from '@/lib/site';

type SitemapEntry = MetadataRoute.Sitemap[number];

const absoluteUrl = (path = '') => `${siteConfig.url}${path}`;

export default function sitemap(): MetadataRoute.Sitemap {
  const detailListings = listings.filter((listing) => listing.category !== 'emergency');

  const staticPages: SitemapEntry[] = [
    { url: absoluteUrl(), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/directory'), changeFrequency: 'weekly', priority: 0.95 },
    { url: absoluteUrl('/villages'), changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/emergency'), changeFrequency: 'monthly', priority: 0.8 },
  ];

  const categoryPages: SitemapEntry[] = categories.map((category) => ({
    url: absoluteUrl(`/directory/${category.id}`),
    changeFrequency: 'weekly',
    priority: category.id === 'doctors' || category.id === 'pharmacies' ? 0.9 : 0.85,
  }));

  const villagePages: SitemapEntry[] = villages.map((village) => ({
    url: absoluteUrl(`/villages/${village.slug}`),
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  const listingPages: SitemapEntry[] = detailListings.map((listing) => ({
    url: absoluteUrl(`/listing/${listing.slug}`),
    changeFrequency: 'monthly',
    priority: listing.sourceStatus === 'google_verified' ? 0.75 : 0.7,
  }));

  const entries = [...staticPages, ...categoryPages, ...villagePages, ...listingPages];

  // Keep the sitemap deterministic and protect it from accidental duplicate URLs.
  return Array.from(new Map(entries.map((entry) => [entry.url, entry])).values());
}
