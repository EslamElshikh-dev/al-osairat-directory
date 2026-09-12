import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/auth/supabase-rest';
import { queryDirectoryListings, type DirectoryQueryOptions, type DirectoryQueryResult } from '@/lib/directory-query';
import { fetchSupabasePublicJson } from '@/lib/supabase-public-fetch';
import type { DataSource, DirectoryCategory, DirectoryListing, SourceStatus } from '@/lib/types';

export type DirectoryAuthoritySummary = {
  total: number;
  averageQuality: number;
  strong: number;
  needsAttention: number;
  needsReview: number;
  missingPhone: number;
  missingDescription: number;
  missingMapsUrl: number;
  missingPlaceId: number;
  googleVerified: number;
  crossChecked: number;
  sourceOnly: number;
  trusted: number;
};

export type DirectoryAuthorityCoverage = {
  trustedPct: number;
  phonePct: number;
  descriptionPct: number;
  mapsUrlPct: number;
  placeIdPct: number;
};

export type DirectoryAuthorityQueueItem = {
  id: string;
  slug: string;
  title: string;
  category: DirectoryCategory;
  village: string;
  qualityScore: number;
  sourceStatus: SourceStatus;
  missingMapsUrl: boolean;
  missingPlaceId: boolean;
  missingPhone: boolean;
  missingDescription: boolean;
  authorityPriority: number;
};

export type DirectoryAuthorityReport = {
  canonicalReady: true;
  summary: DirectoryAuthoritySummary;
  coverage: DirectoryAuthorityCoverage;
  queue: DirectoryAuthorityQueueItem[];
};

type DirectoryEntityRow = {
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
  rating: number | null;
  review_count: number | null;
  rating_source: 'legacy' | 'google' | null;
  source: DataSource;
  source_status: SourceStatus;
  delivery_available: boolean | null;
  emergency: boolean | null;
  google_place_id: string | null;
  google_maps_plus_code: string | null;
  google_maps_url: string | null;
  last_updated_at: string | null;
};

const canonicalSelect = [
  'id', 'slug', 'title', 'category', 'sub_category', 'location', 'village', 'locality',
  'phone', 'whatsapp', 'hours', 'description', 'rating', 'review_count', 'rating_source',
  'source', 'source_status', 'delivery_available', 'emergency', 'google_place_id',
  'google_maps_plus_code', 'google_maps_url', 'last_updated_at',
].join(',');

// The synchronized table currently mirrors the full public catalog. If a future
// sync partially fails, refuse the canonical cutover and let callers use their
// existing static + published fallback instead of hiding large parts of the site.
const MIN_CANONICAL_DIRECTORY_ROWS = 300;

function publicRpcHeaders() {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

function publicReadHeaders() {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Accept: 'application/json',
  };
}

function serializeDirectoryEntity(row: DirectoryEntityRow): DirectoryListing {
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
    reviewCount: row.review_count || 0,
    ratingSource: row.rating_source || undefined,
    source: row.source,
    sourceStatus: row.source_status,
    deliveryAvailable: row.delivery_available || undefined,
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
  const params = new URLSearchParams({
    select: canonicalSelect,
    is_active: 'eq.true',
    limit: '1000',
  });

  const rows = await fetchSupabasePublicJson<DirectoryEntityRow[]>(
    `${SUPABASE_URL}/rest/v1/directory_entities?${params.toString()}`,
    { headers: publicReadHeaders() },
  );

  if (!rows || rows.length < MIN_CANONICAL_DIRECTORY_ROWS) return null;
  return queryDirectoryListings(rows.map(serializeDirectoryEntity), options);
}

export async function getDirectoryAuthorityReport(limit = 12): Promise<DirectoryAuthorityReport | null> {
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit || 12), 50));

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_directory_authority_report`, {
      method: 'POST',
      headers: publicRpcHeaders(),
      body: JSON.stringify({ p_limit: safeLimit }),
      cache: 'no-store',
    });

    if (!response.ok) return null;
    const payload = await response.json() as Partial<DirectoryAuthorityReport>;
    if (!payload.canonicalReady || !payload.summary || !payload.coverage) return null;

    return {
      canonicalReady: true,
      summary: payload.summary,
      coverage: payload.coverage,
      queue: Array.isArray(payload.queue) ? payload.queue : [],
    };
  } catch {
    return null;
  }
}
