import { listings } from '@/lib/data';
import { canonicalSnapshotHasReleaseParity } from '@/lib/canonical-parity';
import { mergeDirectoryListings } from '@/lib/directory-query';
import { getCanonicalDirectoryListings } from '@/lib/directory-repository';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';

export async function getPublicDirectoryListings() {
  const [publishedListings, baseListings, canonicalListings] = await Promise.all([
    getPublishedListings(),
    applyListingOverrides(listings),
    getCanonicalDirectoryListings(),
  ]);

  const releaseListings = mergeDirectoryListings(baseListings, publishedListings);

  if (canonicalListings && canonicalSnapshotHasReleaseParity(canonicalListings, releaseListings)) {
    return canonicalListings;
  }

  return releaseListings;
}
