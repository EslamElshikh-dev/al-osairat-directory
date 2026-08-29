import { normalizeDirectoryText } from './directory-query';
import type { DirectoryListing } from './types';

export type TransportVehicleFilter = 'all' | 'car' | 'microbus' | 'tuktuk' | 'bus';
export type TransportDestinationFilter = 'all' | 'sohag' | 'girga' | 'monshaa' | 'local';

export const transportVehicleFilters: Array<{ value: TransportVehicleFilter; label: string }> = [
  { value: 'all', label: 'كل الوسائل' },
  { value: 'car', label: 'سيارة خاصة' },
  { value: 'microbus', label: 'ميكروباص' },
  { value: 'tuktuk', label: 'توك توك' },
  { value: 'bus', label: 'أتوبيس' },
];

export const transportDestinationFilters: Array<{ value: TransportDestinationFilter; label: string }> = [
  { value: 'all', label: 'كل الوجهات' },
  { value: 'sohag', label: 'سوهاج' },
  { value: 'girga', label: 'جرجا' },
  { value: 'monshaa', label: 'المنشأة' },
  { value: 'local', label: 'داخل قرى المركز' },
];

function normalizedSubCategory(listing: DirectoryListing) {
  return normalizeDirectoryText(listing.subCategory || '');
}

function routeText(listing: DirectoryListing) {
  return normalizeDirectoryText(
    [listing.title, listing.subCategory, listing.locality, listing.description]
      .filter(Boolean)
      .join(' '),
  );
}

function matchesVehicle(listing: DirectoryListing, filter: TransportVehicleFilter) {
  if (filter === 'all') return true;
  const subCategory = normalizedSubCategory(listing);

  if (filter === 'car') return /(سياره خاصه|تاكسي|ملاكي)/.test(subCategory);
  if (filter === 'microbus') return /ميكروباص/.test(subCategory);
  if (filter === 'tuktuk') return /(توك توك|تكاتك|تكتك)/.test(subCategory);
  if (filter === 'bus') return /(اتوبيس|باص|نقل جماعي|نقل داخلي)/.test(subCategory);
  return true;
}

function matchesDestination(listing: DirectoryListing, filter: TransportDestinationFilter) {
  if (filter === 'all') return true;
  const text = routeText(listing);

  if (filter === 'sohag') return /سوهاج/.test(text);
  if (filter === 'girga') return /جرجا/.test(text);
  if (filter === 'monshaa') return /المنشاه/.test(text);

  if (filter === 'local') {
    const hasExternalDestination = /(سوهاج|جرجا|المنشاه)/.test(text);
    const isTrain = /قطار/.test(normalizedSubCategory(listing));
    return !hasExternalDestination && !isTrain;
  }

  return true;
}

export function normalizeTransportVehicleFilter(value?: string): TransportVehicleFilter {
  return transportVehicleFilters.some((item) => item.value === value)
    ? (value as TransportVehicleFilter)
    : 'all';
}

export function normalizeTransportDestinationFilter(value?: string): TransportDestinationFilter {
  return transportDestinationFilters.some((item) => item.value === value)
    ? (value as TransportDestinationFilter)
    : 'all';
}

export function filterTransportListings(
  listings: DirectoryListing[],
  filters: { vehicle?: string; destination?: string },
) {
  const vehicle = normalizeTransportVehicleFilter(filters.vehicle);
  const destination = normalizeTransportDestinationFilter(filters.destination);

  return listings.filter(
    (listing) =>
      listing.category === 'transport' &&
      matchesVehicle(listing, vehicle) &&
      matchesDestination(listing, destination),
  );
}

export function getTransportVehicleLabel(value?: string) {
  const normalized = normalizeTransportVehicleFilter(value);
  return transportVehicleFilters.find((item) => item.value === normalized)?.label || 'كل الوسائل';
}

export function getTransportDestinationLabel(value?: string) {
  const normalized = normalizeTransportDestinationFilter(value);
  return transportDestinationFilters.find((item) => item.value === normalized)?.label || 'كل الوجهات';
}
