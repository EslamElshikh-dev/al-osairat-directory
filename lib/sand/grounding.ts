import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
import { queryCanonicalDirectory } from '@/lib/directory-repository';
import {
  mergeDirectoryListings,
  queryDirectoryListings,
} from '@/lib/directory-query';
import { categoryById, listings } from '@/lib/data';
import { emergency } from '@/lib/data/emergency';
import type { DirectoryListing } from '@/lib/types';
import type { SandRoutePlan } from './intent';
import { cleanGroundingValue } from './safety';
import type { SandGrounding, SandResult } from './types';

const MAX_RESULTS = 5;

function sourceLabel(listing: DirectoryListing) {
  if (listing.sourceStatus === 'google_verified') return 'موثق من Google Maps';
  if (listing.sourceStatus === 'cross_checked') return 'تمت مراجعته من أكثر من مصدر';
  if (listing.sourceStatus === 'needs_review') return 'قيد المراجعة';
  return 'مصدر محلي مسجل';
}

function toSandResult(listing: DirectoryListing): SandResult {
  return {
    id: listing.id,
    slug: listing.slug,
    title: cleanGroundingValue(listing.title, 120),
    category: listing.category,
    categoryLabel: cleanGroundingValue(categoryById[listing.category]?.shortLabel || 'خدمة', 50),
    village: cleanGroundingValue(listing.village, 80),
    location: cleanGroundingValue(listing.location, 160),
    description: cleanGroundingValue(listing.description, 220) || undefined,
    phone: cleanGroundingValue(listing.phone, 30) || undefined,
    whatsapp: cleanGroundingValue(listing.whatsapp, 30) || undefined,
    hours: cleanGroundingValue(listing.hours, 100) || undefined,
    href: `/listing/${encodeURIComponent(listing.slug)}`,
    sourceLabel: sourceLabel(listing),
    lastUpdatedAt: listing.lastUpdatedAt,
  };
}

export async function getSandDirectoryGrounding(plan: SandRoutePlan): Promise<SandGrounding> {
  const { category, village, query } = plan;
  const options = {
    query: query || undefined,
    category,
    village,
    page: 1,
    pageSize: MAX_RESULTS,
    excludeEmergency: true,
  };

  const canonical = await queryCanonicalDirectory(options);
  if (canonical) {
    return {
      source: 'supabase',
      query,
      total: canonical.total,
      results: canonical.items.slice(0, MAX_RESULTS).map(toSandResult),
    };
  }

  const [published, overridden] = await Promise.all([
    getPublishedListings(),
    applyListingOverrides(listings),
  ]);
  const merged = mergeDirectoryListings(overridden, published);
  const local = queryDirectoryListings(merged, options);

  return {
    source: 'local_snapshot',
    query,
    total: local.total,
    results: local.items.slice(0, MAX_RESULTS).map(toSandResult),
  };
}

export function getSandEmergencyGrounding(): SandGrounding {
  return {
    source: 'static_emergency',
    query: 'طوارئ',
    total: emergency.length,
    results: emergency.map(toSandResult),
  };
}
