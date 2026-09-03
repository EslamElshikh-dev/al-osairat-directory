export type FacebookSource = {
  id: string;
  name: string;
  externalId: string;
  sourceUrl: string;
  trustLevel: "official" | "trusted" | "review";
  publishMode: "automatic" | "review";
  requireLocalMatch: boolean;
  allowSensitiveAutoPublish: boolean;
  pollIntervalSeconds: number;
  graphPageId?: string;
  defaultVillage?: string;
  lastCheckedAt?: string;
};

export type FacebookNewsRow = {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  source: string;
  source_url: string;
  published_at: string;
  village: string;
  topic: string;
  origin: "live";
  status: "published" | "hidden";
  editorial_status: "source-only";
  source_excerpt: string | null;
  source_kind: "facebook";
  source_external_id: string;
  source_parent_external_id: string;
  source_trust_level: FacebookSource["trustLevel"];
  last_seen_at: string;
  updated_at: string;
};

function supabaseUrl() {
  const value = Deno.env.get("SUPABASE_URL")?.trim();
  if (!value) throw new Error("SUPABASE_URL is unavailable");
  return value.replace(/\/$/, "");
}

function secretKey() {
  const dictionary = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (dictionary) {
    try {
      const parsed = JSON.parse(dictionary) as Record<string, unknown>;
      if (typeof parsed.default === "string" && parsed.default.trim()) return parsed.default.trim();
    } catch {
      // Fall through to the legacy key for older projects.
    }
  }
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (legacy) return legacy;
  throw new Error("No Supabase server key is available");
}

function serviceHeaders(key: string, prefer?: string) {
  return {
    apikey: key,
    ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }),
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function serviceRequest<T>(path: string, init: RequestInit = {}, prefer?: string): Promise<T> {
  const key = secretKey();
  const response = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(key, prefer), ...(init.headers || {}) },
  });
  const text = await response.text();
  if (!response.ok) {
    let message = `Supabase request failed (${response.status})`;
    try {
      const parsed = JSON.parse(text) as { message?: unknown; details?: unknown };
      if (typeof parsed.message === "string") message = parsed.message.slice(0, 300);
      else if (typeof parsed.details === "string") message = parsed.details.slice(0, 300);
    } catch {
      // Keep a non-sensitive status error.
    }
    throw new Error(message);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function readFacebookGraphTokenFromVault() {
  const token = await serviceRequest<string | null>(
    "rpc/get_facebook_graph_token_internal",
    { method: "POST", body: "{}" },
  );
  return typeof token === "string" ? token.trim() : "";
}

export async function fetchActiveFacebookSources() {
  const rows = await serviceRequest<Array<{
    id: string;
    name: string;
    external_id: string;
    source_url: string;
    trust_level: FacebookSource["trustLevel"];
    publish_mode: FacebookSource["publishMode"];
    require_local_match: boolean;
    allow_sensitive_auto_publish: boolean;
    poll_interval_seconds: number;
    graph_page_id: string | null;
    default_village: string | null;
    last_checked_at: string | null;
  }>>(
    "news_sources?select=id,name,external_id,source_url,trust_level,publish_mode,require_local_match,allow_sensitive_auto_publish,poll_interval_seconds,graph_page_id,default_village,last_checked_at&source_kind=eq.facebook&active=eq.true&order=name.asc",
  );

  const now = Date.now();
  return rows.flatMap((row) => {
    const checkedAt = row.last_checked_at ? Date.parse(row.last_checked_at) : 0;
    const due = !checkedAt || !Number.isFinite(checkedAt)
      || checkedAt <= now - row.poll_interval_seconds * 1000;
    if (!due) return [];
    return [{
      id: row.id,
      name: row.name,
      externalId: row.external_id,
      sourceUrl: row.source_url,
      trustLevel: row.trust_level,
      publishMode: row.publish_mode,
      requireLocalMatch: row.require_local_match,
      allowSensitiveAutoPublish: row.allow_sensitive_auto_publish,
      pollIntervalSeconds: row.poll_interval_seconds,
      ...(row.graph_page_id ? { graphPageId: row.graph_page_id } : {}),
      ...(row.default_village ? { defaultVillage: row.default_village } : {}),
      ...(row.last_checked_at ? { lastCheckedAt: row.last_checked_at } : {}),
    } satisfies FacebookSource];
  });
}

export async function setResolvedFacebookPageId(sourceId: string, graphPageId: string) {
  if (!/^\d{3,30}$/.test(graphPageId)) throw new Error("Invalid resolved Facebook Page ID");
  await serviceRequest<void>(
    `news_sources?id=eq.${encodeURIComponent(sourceId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ graph_page_id: graphPageId, updated_at: new Date().toISOString() }),
    },
    "return=minimal",
  );
}

export async function markSourceChecked(
  sourceId: string,
  result: { success: boolean; error?: string },
) {
  const now = new Date().toISOString();
  await serviceRequest<void>(
    `news_sources?id=eq.${encodeURIComponent(sourceId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        last_checked_at: now,
        ...(result.success
          ? { last_success_at: now, last_error: null }
          : { last_error: result.error?.slice(0, 500) || "Unknown source error" }),
        updated_at: now,
      }),
    },
    "return=minimal",
  );
}

export async function upsertFacebookNews(items: FacebookNewsRow[]) {
  if (!items.length) return;
  await serviceRequest<void>(
    "news_items?on_conflict=id",
    { method: "POST", body: JSON.stringify(items) },
    "resolution=merge-duplicates,return=minimal",
  );
}
