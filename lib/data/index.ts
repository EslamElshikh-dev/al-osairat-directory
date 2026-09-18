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
import { transport } from './transport';
import { emergency } from './emergency';
import { googleMapsIntake20260829 } from './google-maps-intake-2026-08-29';
import { serviceScan20260904 } from './service-scan-2026-09-04';
import { activityScan20260908 } from './activity-scan-2026-09-08';
import { gaziratAwladHamzaScan20260908 } from './gazirat-awlad-hamza-scan-2026-09-08';
import { gaziratAwladHamzaFollowup20260908 } from './gazirat-awlad-hamza-followup-2026-09-08';
import { gaziratAwladHamzaThirdPass20260908 } from './gazirat-awlad-hamza-third-pass-2026-09-08';
import { gaziratAwladHamzaScan20260913 } from './gazirat-awlad-hamza-scan-2026-09-13';
import { rashaidaScan20260908 } from './rashaida-scan-2026-09-08';
import { rashaidaScan20260913 } from './rashaida-scan-2026-09-13';
import { ahaywaGharbScan20260913 } from './ahaywa-gharb-scan-2026-09-13';
import { nuwairatScan20260913 } from './nuwairat-scan-2026-09-13';
import { awamerAlOsairatScan20260916 } from './awamer-al-osairat-scan-2026-09-16';
import { liveMapsScan20260916 } from './live-maps-scan-2026-09-16';
import { awladGabaraEducationScan20260916 } from './awlad-gabara-education-scan-2026-09-16';
import { nuwairatFollowupScan20260916 } from './nuwairat-followup-scan-2026-09-16';
import { awladHamzaFollowupScan20260916 } from './awlad-hamza-followup-scan-2026-09-16';
import { gaziratAwladHamzaFollowup20260916 } from './gazirat-awlad-hamza-followup-2026-09-16';
import { rashaidaFollowupScan20260916 } from './rashaida-followup-scan-2026-09-16';
import { shuhadaFollowupScan20260916 } from './shuhada-followup-scan-2026-09-16';
import { masaeedFollowupScan20260916 } from './masaeed-followup-scan-2026-09-16';
import { awladBahigFollowupScan20260916 } from './awlad-bahig-followup-scan-2026-09-16';
import { ahaywaGharbFollowupScan20260917 } from './ahaywa-gharb-followup-scan-2026-09-17';
import { nagAbbasFollowupScan20260917 } from './nag-abbas-followup-scan-2026-09-17';
import { awladBahigLocalitiesScan20260917 } from './awlad-bahig-localities-scan-2026-09-17';
import { awladBahigSheikhYusufScan20260917 } from './awlad-bahig-sheikh-yusuf-scan-2026-09-17';
import { awladBahigLiveServicesScan20260917 } from './awlad-bahig-live-services-scan-2026-09-17';
import { awladBahigMosquesScan20260917 } from './awlad-bahig-mosques-scan-2026-09-17';
import { shuhadaDeepScan20260917 } from './shuhada-deep-scan-2026-09-17';
import { awamerHafaydaFollowup20260918 } from './awamer-hafayda-followup-2026-09-18';
import { masaeedSchoolsFollowup20260918 } from './masaeed-schools-followup-2026-09-18';
import { awladGabaraDeepScan20260918 } from './awlad-gabara-deep-scan-2026-09-18';
import { masaeedAzharInstitute20260918 } from './masaeed-azhar-institute-2026-09-18';
import { awqafMosqueGaps20260918 } from './awqaf-mosque-gaps-2026-09-18';
import { masaeedNagAlAbitMosque20260918 } from './masaeed-nag-al-abit-mosque-2026-09-18';
import { nuwairatStGeorgeChurch20260918 } from './nuwairat-st-george-church-2026-09-18';
import { awladGhaziSchools20260918 } from './awlad-ghazi-schools-2026-09-18';
import { awladGabaraAlSiddiqMosque20260918 } from './awlad-gabara-al-siddiq-mosque-2026-09-18';

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
  ...transport,
  ...emergency,
  ...googleMapsIntake20260829,
  ...serviceScan20260904,
  ...activityScan20260908,
  ...gaziratAwladHamzaScan20260908,
  ...gaziratAwladHamzaFollowup20260908,
  ...gaziratAwladHamzaThirdPass20260908,
  ...gaziratAwladHamzaScan20260913,
  ...rashaidaScan20260908,
  ...rashaidaScan20260913,
  ...ahaywaGharbScan20260913,
  ...nuwairatScan20260913,
  ...awamerAlOsairatScan20260916,
  ...liveMapsScan20260916,
  ...awladGabaraEducationScan20260916,
  ...nuwairatFollowupScan20260916,
  ...awladHamzaFollowupScan20260916,
  ...gaziratAwladHamzaFollowup20260916,
  ...rashaidaFollowupScan20260916,
  ...shuhadaFollowupScan20260916,
  ...masaeedFollowupScan20260916,
  ...awladBahigFollowupScan20260916,
  ...ahaywaGharbFollowupScan20260917,
  ...nagAbbasFollowupScan20260917,
  ...awladBahigLocalitiesScan20260917,
  ...awladBahigSheikhYusufScan20260917,
  ...awladBahigLiveServicesScan20260917,
  ...awladBahigMosquesScan20260917,
  ...shuhadaDeepScan20260917,
  ...awamerHafaydaFollowup20260918,
  ...masaeedSchoolsFollowup20260918,
  ...awladGabaraDeepScan20260918,
  ...masaeedAzharInstitute20260918,
  ...awqafMosqueGaps20260918,
  ...masaeedNagAlAbitMosque20260918,
  ...nuwairatStGeorgeChurch20260918,
  ...awladGhaziSchools20260918,
  ...awladGabaraAlSiddiqMosque20260918,
];

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