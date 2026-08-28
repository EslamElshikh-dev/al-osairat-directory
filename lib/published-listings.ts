import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/auth/supabase-rest';
import type { DirectoryCategory, DirectoryListing } from '@/lib/data';

type PublishedBusinessRow = {
  listing_id: string;
  slug: string;
  title: string;
  category: DirectoryCategory;
  sub_category: string | null;
  location: string;
  village: string;
  locality: string | null;
  phone: string | null;
  whatsapp: string | null;
  hours: string | null;
  description: string | null;
  google_maps_url: string | null;
  published_at: string;
};

export type PublishedListing = DirectoryListing & { publishedAt: string };

function publicHeaders() {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Accept: 'application/json',
  };
}

function serialize(row: PublishedBusinessRow): PublishedListing {
  return {
    id: row.listing_id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    subCategory: row.sub_category || undefined,
    location: row.location,
    village: row.village,
    locality: row.locality || undefined,
    phone: row.phone || undefined,
    whatsapp: row.whatsapp || undefined,
    hours: row.hours || undefined,
    description: row.description || undefined,
    reviewCount: 0,
    source: 'user_collected',
    sourceStatus: 'cross_checked',
    googleMapsUrl: row.google_maps_url || undefined,
    publishedAt: row.published_at,
    lastUpdatedAt: row.published_at,
  };
}

export async function getPublishedListings(filters?: { category?: DirectoryCategory; village?: string }) {
  try {
    const params = new URLSearchParams({
      select: 'listing_id,slug,title,category,sub_category,location,village,locality,phone,whatsapp,hours,description,google_maps_url,published_at',
      order: 'published_at.desc',
    });
    if (filters?.category) params.set('category', `eq.${filters.category}`);
    if (filters?.village) params.set('village', `eq.${filters.village}`);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/published_businesses?${params.toString()}`, {
      headers: publicHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) return [] as PublishedListing[];
    const rows = await response.json() as PublishedBusinessRow[];
    return rows.map(serialize);
  } catch {
    return [] as PublishedListing[];
  }
}

export async function getPublishedListingBySlug(slug: string) {
  try {
    const params = new URLSearchParams({
      select: 'listing_id,slug,title,category,sub_category,location,village,locality,phone,whatsapp,hours,description,google_maps_url,published_at',
      slug: `eq.${slug}`,
      limit: '1',
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/published_businesses?${params.toString()}`, {
      headers: publicHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const rows = await response.json() as PublishedBusinessRow[];
    return rows[0] ? serialize(rows[0]) : null;
  } catch {
    return null;
  }
}

export async function getPublishedListingById(listingId: string) {
  try {
    const params = new URLSearchParams({
      select: 'listing_id,slug,title,category,sub_category,location,village,locality,phone,whatsapp,hours,description,google_maps_url,published_at',
      listing_id: `eq.${listingId}`,
      limit: '1',
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/published_businesses?${params.toString()}`, {
      headers: publicHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const rows = await response.json() as PublishedBusinessRow[];
    return rows[0] ? serialize(rows[0]) : null;
  } catch {
    return null;
  }
}
