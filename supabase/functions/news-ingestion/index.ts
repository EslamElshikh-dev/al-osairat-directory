import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import {
  claimNewsIngestion,
  completeNewsIngestion,
  getProcessingStates,
  type NewsIngestionCompletion,
  type ProcessingState,
  saveProcessingResult,
  touchNewsSource,
  upsertDiscoveredNews,
} from "./database.ts";
import {
  buildSourceNewsDigest,
  collectLocalNewsFromSources,
  fetchSourceDetail,
  type LocalNewsItem,
} from "./sources.ts";

// Only the one-way digest is deployed. The random token itself stays encrypted in Vault.
const EXPECTED_TOKEN_SHA256 =
  "9005b67e2135db28cc45fb788271755db56243e2393bed17e2cfb49d71f9ce9a";
const SOURCE_BATCH_SIZE = 12;
const SOURCE_CONCURRENCY = 6;
const READY_REFRESH_AFTER_MS = 1000 * 60 * 60 * 24;
const SOURCE_REFRESH_AFTER_MS = 1000 * 60 * 60 * 6;

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
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
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
  const message =
    error instanceof Error ? error.message : "Unknown ingestion error";
  return message.replace(/\s+/g, " ").slice(0, 240);
}

function shouldProcess(state: ProcessingState | undefined, now: number) {
  if (!state || state.editorialStatus === "pending") return true;
  if (!state.hasSourceDigest && !state.hasGeneratedCoverage) return true;
  if (!state.sourceFetchedAt) return true;
  const fetchedAt = Date.parse(state.sourceFetchedAt);
  if (!Number.isFinite(fetchedAt)) return true;
  const refreshAfter = state.hasGeneratedCoverage
    ? READY_REFRESH_AFTER_MS
    : SOURCE_REFRESH_AFTER_MS;
  return fetchedAt <= now - refreshAfter;
}

function prioritizeItems(
  items: LocalNewsItem[],
  states: Map<string, ProcessingState>,
  now: number,
) {
  return items
    .filter((item) => shouldProcess(states.get(item.id), now))
    .sort((left, right) => {
      const leftState = states.get(left.id);
      const rightState = states.get(right.id);
      const leftCovered = Boolean(
        leftState?.hasSourceDigest || leftState?.hasGeneratedCoverage,
      );
      const rightCovered = Boolean(
        rightState?.hasSourceDigest || rightState?.hasGeneratedCoverage,
      );
      if (leftCovered !== rightCovered)
        return Number(leftCovered) - Number(rightCovered);
      const leftFetched = Date.parse(leftState?.sourceFetchedAt || "") || 0;
      const rightFetched = Date.parse(rightState?.sourceFetchedAt || "") || 0;
      if (leftFetched !== rightFetched) return leftFetched - rightFetched;
      return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
    })
    .slice(0, SOURCE_BATCH_SIZE);
}

async function runIngestion(runId: string, trigger: "cron" | "manual") {
  const errors: NonNullable<NewsIngestionCompletion["errors"]> = [];
  let feed;
  let failedCount = 0;
  let processedCount = 0;
  let skippedUnchangedCount = 0;

  try {
    feed = await collectLocalNewsFromSources(80);
    const seenAt = new Date().toISOString();
    await upsertDiscoveredNews(feed.items, seenAt);
    const states = await getProcessingStates(feed.items.map((item) => item.id));
    const candidates = prioritizeItems(feed.items, states, Date.now());

    const processItem = async (item: LocalNewsItem) => {
      const previous = states.get(item.id);
      const preserveGeneratedCoverage = Boolean(previous?.hasGeneratedCoverage);
      processedCount += 1;
      try {
        const detail = await fetchSourceDetail(item);
        const sourceText = detail.sourceText?.trim() || "";
        const sourceExcerpt = detail.sourceExcerpt || item.summary || "";
        const sourceHash = sourceText ? await sha256(sourceText) : "";

        if (
          !sourceText &&
          (previous?.hasSourceDigest || preserveGeneratedCoverage)
        ) {
          await touchNewsSource(item.id);
          skippedUnchangedCount += 1;
          return;
        }

        if (
          (previous?.hasSourceDigest || preserveGeneratedCoverage) &&
          sourceHash &&
          sourceHash === previous?.sourceHash
        ) {
          await touchNewsSource(item.id);
          skippedUnchangedCount += 1;
          return;
        }

        const sourceDigest = buildSourceNewsDigest({
          ...item,
          ...detail,
          sourceText,
        });
        await saveProcessingResult({
          id: item.id,
          sourceExcerpt,
          sourceText,
          sourceHash,
          sourceDigest,
          editorialStatus: "source-only",
          preserveExistingEditorial: preserveGeneratedCoverage,
        });
      } catch (error) {
        failedCount += 1;
        const message = safeErrorMessage(error);
        errors.push({ id: item.id, stage: "item", message });
        try {
          await saveProcessingResult({
            id: item.id,
            editorialStatus: "failed",
            error: message,
            preserveExistingEditorial: Boolean(
              previous?.hasSourceDigest || preserveGeneratedCoverage,
            ),
          });
        } catch (writeError) {
          errors.push({
            id: item.id,
            stage: "item-write",
            message: safeErrorMessage(writeError),
          });
        }
      }
    };

    for (
      let offset = 0;
      offset < candidates.length;
      offset += SOURCE_CONCURRENCY
    ) {
      await Promise.all(
        candidates.slice(offset, offset + SOURCE_CONCURRENCY).map(processItem),
      );
    }

    const status: NewsIngestionCompletion["status"] =
      feed.connectedSourceCount === 0
        ? "failed"
        : feed.connectedSourceCount < feed.totalSourceCount || failedCount > 0
          ? "partial"
          : "succeeded";
    const completion: NewsIngestionCompletion = {
      status,
      itemCount: feed.items.length,
      liveItemCount: feed.liveItemCount,
      connectedSourceCount: feed.connectedSourceCount,
      totalSourceCount: feed.totalSourceCount,
      generatedCount: 0,
      failedCount,
      ...(errors.length ? { errors: errors.slice(0, 12) } : {}),
    };
    await completeNewsIngestion(runId, completion);
    return {
      ...completion,
      runId,
      trigger,
      processedCount,
      skippedUnchangedCount,
      aiEnabled: false,
    };
  } catch (error) {
    const message = safeErrorMessage(error);
    const completion: NewsIngestionCompletion = {
      status: "failed",
      itemCount: feed?.items.length || 0,
      liveItemCount: feed?.liveItemCount || 0,
      connectedSourceCount: feed?.connectedSourceCount || 0,
      totalSourceCount: feed?.totalSourceCount || 0,
      generatedCount: 0,
      failedCount: Math.max(1, failedCount),
      errors: [...errors, { stage: "run", message }].slice(0, 12),
    };
    try {
      await completeNewsIngestion(runId, completion);
    } catch (completionError) {
      console.error("[news-ingestion] failed to release lease", {
        runId,
        message: safeErrorMessage(completionError),
      });
    }
    throw new Error(message);
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);
  if (!(await requestIsAuthorized(request)))
    return jsonResponse({ error: "Unauthorized" }, 401);

  let trigger: "cron" | "manual" = "cron";
  try {
    const body = (await request.json()) as { trigger?: unknown };
    if (body.trigger === "manual" || body.trigger === "cron")
      trigger = body.trigger;
    else if (body.trigger !== undefined)
      return jsonResponse({ error: "Invalid trigger" }, 400);
  } catch {
    // An empty body is equivalent to a normal cron invocation.
  }

  try {
    const runId = await claimNewsIngestion(trigger, 20);
    if (!runId)
      return jsonResponse(
        { status: "skipped", reason: "recent-or-running" },
        202,
      );
    const result = await runIngestion(runId, trigger);
    console.log("[news-ingestion] completed", {
      runId,
      status: result.status,
      itemCount: result.itemCount,
      connectedSourceCount: result.connectedSourceCount,
      processedCount: result.processedCount,
    });
    return jsonResponse(result);
  } catch (error) {
    console.error("[news-ingestion] failed", {
      message: safeErrorMessage(error),
    });
    return jsonResponse({ error: "News ingestion failed" }, 500);
  }
});
