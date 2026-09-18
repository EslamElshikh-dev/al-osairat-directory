import type { DirectoryListing } from './types';

const comparableFields = [
  'slug', 'title', 'category', 'subCategory', 'location', 'village', 'locality',
  'phone', 'whatsapp', 'hours', 'description', 'rating', 'reviewCount', 'ratingSource',
  'source', 'sourceStatus', 'deliveryAvailable', 'emergency', 'googlePlaceId',
  'googleMapsPlusCode', 'googleMapsUrl',
] as const;

function timeValue(value?: string) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function sameComparableData(left: DirectoryListing, right: DirectoryListing) {
  return comparableFields.every((field) => (left[field] ?? null) === (right[field] ?? null));
}

export type CanonicalCoverageRow = {
  id: string;
  lastUpdatedAt?: string;
};

export type CanonicalCoverageSummary = {
  releaseCount: number;
  canonicalCount: number;
  missingCount: number;
  extraCount: number;
  staleCount: number;
  isCurrent: boolean;
};

export function getCanonicalCoverageSummary(
  canonicalRows: CanonicalCoverageRow[],
  releaseListings: DirectoryListing[],
): CanonicalCoverageSummary {
  const canonicalById = new Map(canonicalRows.map((row) => [row.id, row]));
  const releaseIds = new Set(releaseListings.map((listing) => listing.id));

  let missingCount = 0;
  let staleCount = 0;

  for (const releaseListing of releaseListings) {
    const canonical = canonicalById.get(releaseListing.id);
    if (!canonical) {
      missingCount += 1;
      continue;
    }

    const releaseTime = timeValue(releaseListing.lastUpdatedAt);
    if (releaseTime === null) continue;

    const canonicalTime = timeValue(canonical.lastUpdatedAt);
    if (canonicalTime === null || canonicalTime < releaseTime) staleCount += 1;
  }

  const extraCount = canonicalRows.reduce(
    (count, row) => count + (releaseIds.has(row.id) ? 0 : 1),
    0,
  );

  const releaseCount = releaseListings.length;
  const canonicalCount = canonicalRows.length;

  return {
    releaseCount,
    canonicalCount,
    missingCount,
    extraCount,
    staleCount,
    isCurrent:
      releaseCount > 0
      && canonicalCount === releaseCount
      && canonicalById.size === canonicalCount
      && missingCount === 0
      && extraCount === 0
      && staleCount === 0,
  };
}

export function canonicalCoverageHasReleaseParity(
  canonicalRows: CanonicalCoverageRow[],
  releaseListings: DirectoryListing[],
) {
  if (!releaseListings.length || canonicalRows.length !== releaseListings.length) return false;

  const canonicalById = new Map(canonicalRows.map((row) => [row.id, row]));
  if (canonicalById.size !== canonicalRows.length) return false;

  return releaseListings.every((releaseListing) => {
    const canonical = canonicalById.get(releaseListing.id);
    if (!canonical) return false;

    const releaseTime = timeValue(releaseListing.lastUpdatedAt);
    if (releaseTime === null) return true;

    const canonicalTime = timeValue(canonical.lastUpdatedAt);
    return canonicalTime !== null && canonicalTime >= releaseTime;
  });
}

export function canonicalSnapshotHasReleaseParity(
  canonicalListings: DirectoryListing[],
  releaseListings: DirectoryListing[],
) {
  if (!releaseListings.length || canonicalListings.length !== releaseListings.length) return false;

  const canonicalById = new Map(canonicalListings.map((listing) => [listing.id, listing]));
  if (canonicalById.size !== canonicalListings.length) return false;

  return releaseListings.every((releaseListing) => {
    const canonicalListing = canonicalById.get(releaseListing.id);
    if (!canonicalListing) return false;

    const releaseTime = timeValue(releaseListing.lastUpdatedAt);
    const canonicalTime = timeValue(canonicalListing.lastUpdatedAt);

    if (releaseTime !== null) {
      if (canonicalTime === null || canonicalTime < releaseTime) return false;
      if (canonicalTime === releaseTime && !sameComparableData(canonicalListing, releaseListing)) return false;
      return true;
    }

    if (canonicalTime !== null) return true;
    return sameComparableData(canonicalListing, releaseListing);
  });
}
