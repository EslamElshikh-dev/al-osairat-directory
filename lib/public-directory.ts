import { cache } from 'react';
import { listings } from '@/lib/data';
import {
  canonicalCoverageHasReleaseParity,
  canonicalSnapshotHasReleaseParity,
} from '@/lib/canonical-parity';
import { mergeDirectoryListings } from '@/lib/directory-query';
import {
  getCanonicalDirectoryCoverage,
  getCanonicalDirectoryListings,
  PUBLIC_CANONICAL_READS_ENABLED,
} from '@/lib/directory-repository';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';

export const getPublicDirectoryListings = cache(async function getPublicDirectoryListings() {
  const [publishedListings, baseListings] = await Promise.all([
    getPublishedListings(),
    applyListingOverrides(listings),
  ]);

  const releaseListings = mergeDirectoryListings(baseListings, publishedListings);

  if (!PUBLIC_CANONICAL_READS_ENABLED) return releaseListings;

  const canonicalCoverage = await getCanonicalDirectoryCoverage();
  if (!canonicalCoverage || !canonicalCoverageHasReleaseParity(canonicalCoverage, releaseListings)) {
    return releaseListings;
  }

  const canonicalListings = await getCanonicalDirectoryListings();
  if (canonicalListings && canonicalSnapshotHasReleaseParity(canonicalListings, releaseListings)) {
    return canonicalListings;
  }

  return releaseListings;
});
