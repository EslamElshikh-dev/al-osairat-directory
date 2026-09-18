import { listings } from '@/lib/data';
import {
  canonicalCoverageHasReleaseParity,
  canonicalSnapshotHasReleaseParity,
} from '@/lib/canonical-parity';
import { mergeDirectoryListings } from '@/lib/directory-query';
import {
  getCanonicalDirectoryCoverage,
  getCanonicalDirectoryListings,
} from '@/lib/directory-repository';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';

export async function getPublicDirectoryListings() {
  const [publishedListings, baseListings, canonicalCoverage] = await Promise.all([
    getPublishedListings(),
    applyListingOverrides(listings),
    getCanonicalDirectoryCoverage(),
  ]);

  const releaseListings = mergeDirectoryListings(baseListings, publishedListings);

  if (!canonicalCoverage || !canonicalCoverageHasReleaseParity(canonicalCoverage, releaseListings)) {
    return releaseListings;
  }

  const canonicalListings = await getCanonicalDirectoryListings();
  if (canonicalListings && canonicalSnapshotHasReleaseParity(canonicalListings, releaseListings)) {
    return canonicalListings;
  }

  return releaseListings;
}
