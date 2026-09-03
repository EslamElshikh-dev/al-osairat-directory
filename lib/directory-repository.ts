import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/auth/supabase-rest';
import type { DirectoryQueryOptions, DirectoryQueryResult } from '@/lib/directory-query';
import type { DirectoryCategory, SourceStatus } from '@/lib/types';

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

function publicRpcHeaders() {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

export async function queryCanonicalDirectory(
  _options: DirectoryQueryOptions = {},
): Promise<DirectoryQueryResult | null> {
  // Public browsing and search temporarily use the merged live catalog as the
  // source of truth. The canonical Supabase directory table can lag behind a
  // code/data publish, which previously hid fresh listings and caused false
  // zero-result states. Re-enable this repository path only after automatic
  // directory_entities synchronization is guaranteed for every publish.
  return null;
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
