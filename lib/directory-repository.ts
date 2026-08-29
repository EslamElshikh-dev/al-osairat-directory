import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/auth/supabase-rest';
import {
  canonicalizeDirectoryQuery,
  DIRECTORY_PAGE_SIZE,
  type DirectoryQueryOptions,
  type DirectoryQueryResult,
} from '@/lib/directory-query';
import type { DirectoryCategory, DirectoryListing, DataSource, SourceStatus } from '@/lib/types';

type CanonicalRow = {
  id: string;
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
  rating: number | string | null;
  review_count: number | string;
  rating_source: 'legacy' | 'google' | null;
  source: DataSource;
  source_status: SourceStatus;
  delivery_available: boolean | null;
  emergency: boolean;
  google_place_id: string | null;
  google_maps_plus_code: string | null;
  google_maps_url: string | null;
  last_updated_at: string | null;
  quality_score: number;
  search_rank: number;
};

type CanonicalSearchResponse = {
  canonicalReady?: boolean;
  items?: CanonicalRow[];
  total?: number;
  page?: number;
  totalPages?: number;
  pageSize?: number;
  from?: number;
  to?: number;
};

function publicRpcHeaders() {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

function serialize(row: CanonicalRow): DirectoryListing {
  return {
    id: row.id,
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
    rating: row.rating == null ? undefined : Number(row.rating),
    reviewCount: Number(row.review_count || 0),
    ratingSource: row.rating_source || undefined,
    source: row.source,
    sourceStatus: row.source_status,
    deliveryAvailable: row.delivery_available ?? undefined,
    emergency: row.emergency || undefined,
    googlePlaceId: row.google_place_id || undefined,
    googleMapsPlusCode: row.google_maps_plus_code || undefined,
    googleMapsUrl: row.google_maps_url || undefined,
    lastUpdatedAt: row.last_updated_at || undefined,
  };
}

export async function queryCanonicalDirectory(
  options: DirectoryQueryOptions = {},
): Promise<DirectoryQueryResult | null> {
  const pageSize = Math.max(1, Math.min(options.pageSize || DIRECTORY_PAGE_SIZE, 60));
  const page = Number.isFinite(options.page) ? Math.max(1, Math.trunc(options.page || 1)) : 1;
  const query = options.query?.trim() ? canonicalizeDirectoryQuery(options.query) : '';

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_directory_entities`, {
      method: 'POST',
      headers: publicRpcHeaders(),
      body: JSON.stringify({
        p_query: query || null,
        p_category: options.category || null,
        p_village: options.village && options.village !== 'all' ? options.village : null,
        p_page: page,
        p_page_size: pageSize,
      }),
      cache: 'no-store',
    });

    if (!response.ok) return null;
    const payload = await response.json() as CanonicalSearchResponse;
    if (!payload.canonicalReady) return null;

    const items = Array.isArray(payload.items) ? payload.items.map(serialize) : [];
    if (options.excludeEmergency) {
      // The public directory currently keeps emergency records on their dedicated route.
      // Once the canonical catalog is active this defensive filter preserves that behavior.
      const visible = items.filter((item) => item.category !== 'emergency');
      if (visible.length !== items.length) return null;
    }

    return {
      items,
      total: Number(payload.total || 0),
      page: Math.max(1, Number(payload.page || 1)),
      totalPages: Math.max(1, Number(payload.totalPages || 1)),
      pageSize: Math.max(1, Number(payload.pageSize || pageSize)),
      from: Number(payload.from || 0),
      to: Number(payload.to || 0),
    };
  } catch {
    return null;
  }
}
