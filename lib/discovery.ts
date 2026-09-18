import type { DirectoryCategory, DirectoryListing, VillageInfo } from './types';
import { categories, villages } from './data';
import { normalizeDirectoryText } from './directory-query';

export interface VillageCoverage {
  village: VillageInfo;
  listingCount: number;
  categoryCount: number;
  verifiedCount: number;
}

export function getVillageCoverage(allListings: DirectoryListing[]): VillageCoverage[] {
  return villages
    .filter((village) => village.name !== 'مركز العسيرات')
    .map((village) => {
      const listings = allListings.filter(
        (item) => item.village === village.name && item.category !== 'emergency',
      );
      return {
        village,
        listingCount: listings.length,
        categoryCount: new Set(listings.map((item) => item.category)).size,
        verifiedCount: listings.filter(
          (item) => item.sourceStatus === 'google_verified' || item.sourceStatus === 'cross_checked',
        ).length,
      };
    });
}

export function getUndercoveredVillages(allListings: DirectoryListing[], limit = 4) {
  return getVillageCoverage(allListings)
    .filter((item) => item.listingCount > 0)
    .sort(
      (a, b) =>
        a.categoryCount - b.categoryCount
        || a.listingCount - b.listingCount
        || a.verifiedCount - b.verifiedCount
        || a.village.name.localeCompare(b.village.name, 'ar'),
    )
    .slice(0, limit);
}

export function getLowCoverageCategories(
  allListings: DirectoryListing[],
  villageName: string,
  limit = 4,
) {
  const villageListings = allListings.filter(
    (item) => item.village === villageName && item.category !== 'emergency',
  );

  return categories
    .filter((category) => category.id !== 'emergency')
    .map((category) => ({
      category,
      count: villageListings.filter((item) => item.category === category.id).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => a.count - b.count || a.category.shortLabel.localeCompare(b.category.shortLabel, 'ar'))
    .slice(0, limit);
}

function normalizedSubCategory(listing: DirectoryListing) {
  return normalizeDirectoryText(listing.subCategory || '');
}

function relatedScore(source: DirectoryListing, candidate: DirectoryListing) {
  let score = 0;

  if (candidate.category === source.category) score += 70;
  if (candidate.village === source.village) score += 45;

  const sourceSubCategory = normalizedSubCategory(source);
  const candidateSubCategory = normalizedSubCategory(candidate);
  if (sourceSubCategory && candidateSubCategory && sourceSubCategory === candidateSubCategory) score += 45;

  const sourceLocality = normalizeDirectoryText(source.locality || '');
  const candidateLocality = normalizeDirectoryText(candidate.locality || '');
  if (sourceLocality && candidateLocality && sourceLocality === candidateLocality) score += 22;

  if (candidate.sourceStatus === 'google_verified') score += 8;
  else if (candidate.sourceStatus === 'cross_checked') score += 5;

  if (candidate.phone) score += 2;
  if (candidate.googlePlaceId || candidate.googleMapsUrl) score += 2;

  return score;
}

export function getRelatedListings(
  listing: DirectoryListing,
  allListings: DirectoryListing[],
  limit = 4,
) {
  return allListings
    .filter((candidate) => candidate.id !== listing.id && candidate.category !== 'emergency')
    .map((candidate) => ({ candidate, score: relatedScore(listing, candidate) }))
    .filter(({ candidate, score }) =>
      score >= 45
      && (candidate.category === listing.category || candidate.village === listing.village),
    )
    .sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title, 'ar'))
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

export function villageCategoryDirectoryHref(
  villageName: string,
  category: DirectoryCategory,
) {
  return `/directory/${category}?village=${encodeURIComponent(villageName)}`;
}
