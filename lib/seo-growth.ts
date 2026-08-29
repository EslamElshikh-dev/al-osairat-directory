import type { DirectoryListing } from '@/lib/types';
import { villages } from '@/lib/data/base';
import { siteConfig } from '@/lib/site';

type SearchState = {
  q?: string;
  query?: string;
  village?: string;
  page?: string | number;
};

type CollectionBreadcrumb = {
  name: string;
  path: string;
};

type CollectionSchemaInput = {
  title: string;
  description: string;
  path: string;
  items: DirectoryListing[];
  totalItems: number;
  page?: number;
  pageSize?: number;
  breadcrumbs: CollectionBreadcrumb[];
};

const absoluteUrl = (path = '') => `${siteConfig.url}${path}`;

export function isFilteredDirectoryState(state: SearchState) {
  const query = String(state.q || state.query || '').trim();
  const village = String(state.village || '').trim();
  const page = Math.max(1, Number(state.page || 1) || 1);
  return Boolean(query || (village && village !== 'all') || page > 1);
}

export function villagePathByName(name: string) {
  const village = villages.find((item) => item.name === name);
  return village ? `/villages/${encodeURIComponent(village.slug)}` : '';
}

export function listingDataQualityScore(listing: DirectoryListing) {
  let score = 35;
  if (listing.phone && listing.phone !== '0') score += 15;
  if (listing.description?.trim()) score += 10;
  if (listing.hours?.trim()) score += 10;
  if (listing.googlePlaceId || listing.googleMapsUrl) score += 12;
  if (listing.lastUpdatedAt) score += 8;
  if (listing.locality?.trim()) score += 4;
  if (listing.sourceStatus === 'cross_checked') score += 3;
  if (listing.sourceStatus === 'google_verified') score += 6;
  if (listing.sourceStatus === 'needs_review') score -= 12;
  return Math.max(20, Math.min(100, score));
}

export function listingSitemapPriority(listing: DirectoryListing) {
  const quality = listingDataQualityScore(listing);
  const base = listing.sourceStatus === 'google_verified' ? 0.74 : listing.sourceStatus === 'needs_review' ? 0.56 : 0.66;
  const qualityBoost = Math.max(0, quality - 50) / 500;
  return Number(Math.min(0.82, base + qualityBoost).toFixed(2));
}

export function buildCollectionStructuredData({
  title,
  description,
  path,
  items,
  totalItems,
  page = 1,
  pageSize = items.length || 1,
  breadcrumbs,
}: CollectionSchemaInput) {
  const canonicalUrl = absoluteUrl(path);
  const listId = `${canonicalUrl}#item-list`;
  const collectionId = `${canonicalUrl}#collection`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': collectionId,
        name: title,
        description,
        url: canonicalUrl,
        inLanguage: 'ar-EG',
        isPartOf: { '@type': 'WebSite', '@id': `${siteConfig.url}#website`, url: siteConfig.url, name: siteConfig.name },
        mainEntity: { '@id': listId },
      },
      {
        '@type': 'ItemList',
        '@id': listId,
        name: title,
        numberOfItems: totalItems,
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: (page - 1) * pageSize + index + 1,
          name: item.title,
          url: absoluteUrl(`/listing/${encodeURIComponent(item.slug)}`),
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: absoluteUrl(item.path),
        })),
      },
    ],
  };
}
