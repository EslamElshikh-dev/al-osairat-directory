import type { MetadataRoute } from 'next';
import { categories, listings, villages } from '@/lib/data';
import { siteConfig } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const detailListings = listings.filter((listing) => listing.category !== 'emergency');
  return [
    { url: siteConfig.url, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteConfig.url}/directory`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteConfig.url}/villages`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteConfig.url}/emergency`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    ...categories.map((category) => ({ url: `${siteConfig.url}/directory/${category.id}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...villages.map((village) => ({ url: `${siteConfig.url}/villages/${village.slug}`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.75 })),
    ...detailListings.map((listing) => ({ url: `${siteConfig.url}/listing/${listing.slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.65 })),
  ];
}
