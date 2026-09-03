import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import {
  fetchActiveFacebookSources,
  markSourceChecked,
  readFacebookGraphTokenFromVault,
  setResolvedFacebookPageId,
  upsertFacebookNews,
  type FacebookSource,
} from "./database.ts";
import {
  fetchFacebookPagePosts,
  mapFacebookPostToNews,
  resolveFacebookPageId,
} from "./facebook.ts";

const EXPECTED_TOKEN_SHA256 = "9005b67e2135db28cc45fb788271755db56243e2393bed17e2cfb49d71f9ce9a";
const MAX_SOURCE_CONCURRENCY = 4;

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function sha256(value: string) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fixedTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function requestIsAuthorized(request: Request) {
  const token = request.headers.get("x-news-cron-token")?.trim() || "";
  if (token.length < 32 || token.length > 256) return false;
  return fixedTimeEqual(await sha256(token), EXPECTED_TOKEN_SHA256);
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown Facebook ingestion error";
  return message.replace(/\s+/g, " ").slice(0, 300);
}

async function facebookToken() {
  const direct = Deno.env.get("FACEBOOK_GRAPH_ACCESS_TOKEN")?.trim()
    || Deno.env.get("META_GRAPH_ACCESS_TOKEN")?.trim()
    || "";
  if (direct) return direct;
  return await readFacebookGraphTokenFromVault();
}

async function processSource(source: FacebookSource, token: string) {
  let discovered = 0;
  let published = 0;
  let heldForReview = 0;
  let skipped = 0;

  try {
    const resolvedPageId = await resolveFacebookPageId(source, token);
    if (resolvedPageId !== source.graphPageId) {
      await setResolvedFacebookPageId(source.id, resolvedPageId);
    }
    const effectiveSource: FacebookSource = { ...source, graphPageId: resolvedPageId };
    const posts = await fetchFacebookPagePosts(effectiveSource, token);
    const mapped = posts.flatMap((post) => {
      const item = mapFacebookPostToNews(effectiveSource, post);
      if (!item) {
        skipped += 1;
        return [];
      }
      discovered += 1;
      if (item.status === "published") published += 1;
      else heldForReview += 1;
      return [item];
    });

    await upsertFacebookNews(mapped);
    await markSourceChecked(source.id, { success: true });
    return { sourceId: source.id, graphPageId: resolvedPageId, discovered, published, heldForReview, skipped };
  } catch (error) {
    const message = safeErrorMessage(error);
    await markSourceChecked(source.id, { success: false, error: message });
    return { sourceId: source.id, discovered, published, heldForReview, skipped, error: message };
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  if (!(await requestIsAuthorized(request))) return jsonResponse({ error: "Unauthorized" }, 401);

  const token = await facebookToken();
  if (!token) {
    return jsonResponse({
      ok: true,
      configured: false,
      reason: "facebook-access-token-missing",
      message: "Store facebook_graph_access_token_v1 in Supabase Vault after Meta app approval before enabling Facebook polling.",
    }, 200);
  }

  try {
    const sources = await fetchActiveFacebookSources();
    if (!sources.length) {
      return jsonResponse({ ok: true, configured: true, sourceCount: 0, results: [] });
    }

    const results: Awaited<ReturnType<typeof processSource>>[] = [];
    for (let offset = 0; offset < sources.length; offset += MAX_SOURCE_CONCURRENCY) {
      const batch = sources.slice(offset, offset + MAX_SOURCE_CONCURRENCY);
      results.push(...await Promise.all(batch.map((source) => processSource(source, token))));
    }

    const failedSourceCount = results.filter((result) => result.error).length;
    return jsonResponse({
      ok: failedSourceCount === 0,
      configured: true,
      sourceCount: sources.length,
      failedSourceCount,
      discoveredCount: results.reduce((sum, result) => sum + result.discovered, 0),
      publishedCount: results.reduce((sum, result) => sum + result.published, 0),
      heldForReviewCount: results.reduce((sum, result) => sum + result.heldForReview, 0),
      skippedCount: results.reduce((sum, result) => sum + result.skipped, 0),
      results,
    }, failedSourceCount === sources.length ? 502 : 200);
  } catch (error) {
    console.error("[facebook-news-ingestion] failed", { message: safeErrorMessage(error) });
    return jsonResponse({ ok: false, error: "Facebook news ingestion failed" }, 500);
  }
});
