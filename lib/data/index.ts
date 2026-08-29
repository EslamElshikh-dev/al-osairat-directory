import type { DirectoryCategory, DirectoryListing } from '../types';
import { normalizeDirectoryListing } from '../directory-query';
import { categories, villages } from './base';
import { doctors } from './doctors';
import { pharmacies } from './pharmacies';
import { shops } from './shops';
import { education } from './education';
import { crafts } from './crafts';
import { restaurants } from './restaurants';
import { lawyers } from './lawyers';
import { clerics } from './clerics';
import { government } from './government';
import { community } from './community';
import { emergency } from './emergency';
import { googleMapsIntake20260829 } from './google-maps-intake-2026-08-29';

export * from '../types';
export { categories, villages };

const rawListings: DirectoryListing[] = [
  ...doctors,
  ...pharmacies,
  ...shops,
  ...education,
  ...crafts,
  ...restaurants,
  ...lawyers,
  ...clerics,
  ...government,
  ...community,
  ...emergency,
  ...googleMapsIntake20260829,
];

// Keep immutable IDs/slugs untouched while standardizing user-facing legacy data
// in one place. This makes cards, detail pages, search and structured data agree.
export const listings: DirectoryListing[] = rawListings.map(normalizeDirectoryListing);

export const categoryById = Object.fromEntries(
  categories.map((category) => [category.id, category]),
) as Record<DirectoryCategory, (typeof categories)[number]>;

export const listingBySlug = Object.fromEntries(
  listings.map((listing) => [listing.slug, listing]),
) as Record<string, DirectoryListing>;

export const villageBySlug = Object.fromEntries(
  villages.map((village) => [village.slug, village]),
) as Record<string, (typeof villages)[number]>;

export function getListingsByCategory(category: DirectoryCategory) {
  return listings.filter((listing) => listing.category === category);
}

export function getListingsByVillage(villageName: string) {
  return listings.filter((listing) => listing.village === villageName);
}

export const directoryStats = {
  total: listings.length,
  villages: villages.filter((village) => village.name !== 'مركز العسيرات').length,
  googleVerified: listings.filter((listing) => listing.sourceStatus === 'google_verified').length,
  categories: categories.length,
};