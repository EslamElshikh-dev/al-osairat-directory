import type { LocalNewsItem, SourceNewsDigest } from "./sources.ts";

export type ProcessingState = {
  id: string;
  editorialStatus:
    "source-only" | "pending" | "ready" | "insufficient" | "failed";
  sourceHash?: string;
  sourceFetchedAt?: string;
  hasSourceDigest: boolean;
  hasGeneratedCoverage: boolean;
};

export type NewsIngestionCompletion = {
  status: "succeeded" | "partial" | "failed";
  itemCount: number;
  liveItemCount: number;
  connectedSourceCount: number;
  totalSourceCount: number;
  generatedCount: number;
  failedCount: number;
  errors?: Array<{ id?: string; stage: string; message: string }>;
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
      if (typeof parsed.default === "string" && parsed.default.trim())
        return parsed.default.trim();
    } catch {
      // Fall back to the legacy service-role key during key migration.
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

async function serviceRequest<T>(
  path: string,
  init: RequestInit = {},
  prefer?: string,
): Promise<T> {
  const key = secretKey();
  const response = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    ...init,
    headers: { ...serviceHeaders(key, prefer), ...(init.headers || {}) },
  });
  const text = await response.text();
  if (!response.ok) {
    let message = `Supabase request failed (${response.status})`;
    try {
      const parsed = JSON.parse(text) as {
        message?: unknown;
        details?: unknown;
      };
      if (typeof parsed.message === "string")
        message = parsed.message.slice(0, 260);
      else if (typeof parsed.details === "string")
        message = parsed.details.slice(0, 260);
    } catch {
      // Keep a status-only error; never include response bodies in function logs.
    }
    throw new Error(message);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function claimNewsIngestion(
  trigger: "cron" | "manual",
  minimumIntervalMinutes = 20,
) {
  const runId = await serviceRequest<string | null>(
    "rpc/claim_news_ingestion",
    {
      method: "POST",
      body: JSON.stringify({
        p_trigger: trigger,
        p_min_interval_minutes: minimumIntervalMinutes,
      }),
    },
  );
  return typeof runId === "string" && runId ? runId : undefined;
}

export async function completeNewsIngestion(
  runId: string,
  result: NewsIngestionCompletion,
) {
  await serviceRequest<void>("rpc/complete_news_ingestion", {
    method: "POST",
    body: JSON.stringify({
      p_run_id: runId,
      p_status: result.status,
      p_item_count: result.itemCount,
      p_live_item_count: result.liveItemCount,
      p_connected_source_count: result.connectedSourceCount,
      p_total_source_count: result.totalSourceCount,
      p_generated_count: result.generatedCount,
      p_failed_count: result.failedCount,
      p_error_summary: result.errors?.length
        ? result.errors.slice(0, 12)
        : null,
    }),
  });
}

function isObjectKind(value: unknown, kind: string) {
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as Record<string, unknown>).kind === kind,
  );
}

export async function getProcessingStates(ids: string[]) {
  const safeIds = ids
    .filter((id) => /^[a-z0-9-]{1,120}$/i.test(id))
    .slice(0, 100);
  if (!safeIds.length) return new Map<string, ProcessingState>();
  const rows = await serviceRequest<
    Array<{
      id: string;
      editorial_status: ProcessingState["editorialStatus"];
      source_hash: string | null;
      source_fetched_at: string | null;
      generated_editorial: unknown;
    }>
  >(
    `news_items?select=id,editorial_status,source_hash,source_fetched_at,generated_editorial&id=in.(${safeIds.join(",")})`,
  );
  return new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        editorialStatus: row.editorial_status,
        ...(row.source_hash ? { sourceHash: row.source_hash } : {}),
        ...(row.source_fetched_at
          ? { sourceFetchedAt: row.source_fetched_at }
          : {}),
        hasSourceDigest: isObjectKind(row.generated_editorial, "source-digest"),
        hasGeneratedCoverage: isObjectKind(
          row.generated_editorial,
          "generated-coverage",
        ),
      },
    ]),
  );
}

export async function upsertDiscoveredNews(
  items: LocalNewsItem[],
  seenAt: string,
) {
  if (!items.length) return;
  const payload = items.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary || null,
    url: item.url,
    source: item.source,
    source_url: item.sourceUrl,
    published_at: item.publishedAt,
    village: item.village,
    topic: item.topic,
    origin: item.origin,
    status: "published",
    last_seen_at: seenAt,
    updated_at: seenAt,
  }));
  await serviceRequest<void>(
    "news_items?on_conflict=id",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    "resolution=merge-duplicates,return=minimal",
  );
}

export async function saveProcessingResult(input: {
  id: string;
  sourceExcerpt?: string;
  sourceText?: string;
  sourceHash?: string;
  sourceDigest?: SourceNewsDigest;
  editorialStatus: ProcessingState["editorialStatus"];
  error?: string;
  preserveExistingEditorial?: boolean;
}) {
  const now = new Date().toISOString();
  const payload = {
    ...(input.sourceExcerpt !== undefined
      ? { source_excerpt: input.sourceExcerpt || null }
      : {}),
    ...(input.sourceText !== undefined
      ? { source_text: input.sourceText || null }
      : {}),
    ...(input.sourceHash !== undefined
      ? { source_hash: input.sourceHash || null }
      : {}),
    source_fetched_at: now,
    updated_at: now,
    last_error: input.error?.slice(0, 500) || null,
    ...(!input.preserveExistingEditorial
      ? {
          editorial_status: input.editorialStatus,
          generated_editorial: input.sourceDigest || null,
        }
      : {}),
  };
  await serviceRequest<void>(
    `news_items?id=eq.${encodeURIComponent(input.id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    "return=minimal",
  );
}

export async function touchNewsSource(id: string) {
  const now = new Date().toISOString();
  await serviceRequest<void>(
    `news_items?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        source_fetched_at: now,
        updated_at: now,
        last_error: null,
      }),
    },
    "return=minimal",
  );
}
