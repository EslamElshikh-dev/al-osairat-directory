import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/auth/supabase-rest';
import { fetchSupabasePublicJson } from '@/lib/supabase-public-fetch';
import type { DirectoryListing, SourceStatus } from '@/lib/types';

type EditableListingFields = {
  title?: string;
  subCategory?: string;
  location?: string;
  village?: string;
  locality?: string;
  phone?: string | null;
  whatsapp?: string | null;
  hours?: string | null;
  description?: string | null;
  googleMapsUrl?: string | null;
  googlePlaceId?: string | null;
  sourceStatus?: SourceStatus;
};

type ListingOverrideRow = {
  listing_id: string;
  fields: EditableListingFields;
  updated_at: string;
};

function publicHeaders() {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Accept: 'application/json',
  };
}

export async function getListingOverrides() {
  const rows = await fetchSupabasePublicJson<ListingOverrideRow[]>(
    `${SUPABASE_URL}/rest/v1/listing_overrides?select=listing_id,fields,updated_at`,
    { headers: publicHeaders() },
  );

  if (!rows) return new Map<string, ListingOverrideRow>();
  return new Map(rows.map((row) => [row.listing_id, row]));
}

function optionalValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isSourceStatus(value: unknown): value is SourceStatus {
  return value === 'source_only'
    || value === 'cross_checked'
    || value === 'google_verified'
    || value === 'needs_review';
}

export function applyListingOverride(listing: DirectoryListing, row?: ListingOverrideRow | null): DirectoryListing {
  if (!row?.fields) return listing;
  const fields = row.fields;
  return {
    ...listing,
    title: optionalValue(fields.title) || listing.title,
    subCategory: Object.prototype.hasOwnProperty.call(fields, 'subCategory') ? optionalValue(fields.subCategory) : listing.subCategory,
    location: optionalValue(fields.location) || listing.location,
    village: optionalValue(fields.village) || listing.village,
    locality: Object.prototype.hasOwnProperty.call(fields, 'locality') ? optionalValue(fields.locality) : listing.locality,
    phone: Object.prototype.hasOwnProperty.call(fields, 'phone') ? optionalValue(fields.phone) : listing.phone,
    whatsapp: Object.prototype.hasOwnProperty.call(fields, 'whatsapp') ? optionalValue(fields.whatsapp) : listing.whatsapp,
    hours: Object.prototype.hasOwnProperty.call(fields, 'hours') ? optionalValue(fields.hours) : listing.hours,
    description: Object.prototype.hasOwnProperty.call(fields, 'description') ? optionalValue(fields.description) : listing.description,
    googleMapsUrl: Object.prototype.hasOwnProperty.call(fields, 'googleMapsUrl') ? optionalValue(fields.googleMapsUrl) : listing.googleMapsUrl,
    googlePlaceId: Object.prototype.hasOwnProperty.call(fields, 'googlePlaceId') ? optionalValue(fields.googlePlaceId) : listing.googlePlaceId,
    sourceStatus: isSourceStatus(fields.sourceStatus) ? fields.sourceStatus : listing.sourceStatus,
    lastUpdatedAt: row.updated_at || listing.lastUpdatedAt,
  };
}

export async function applyListingOverrides(listings: DirectoryListing[]) {
  const overrides = await getListingOverrides();
  if (!overrides.size) return listings;
  return listings.map((listing) => applyListingOverride(listing, overrides.get(listing.id)));
}
