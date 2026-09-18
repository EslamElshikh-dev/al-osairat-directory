import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const ACTIVITY_IMAGE_CACHE_VERSION = 1;

export function createActivityImageFingerprint({
  listingId,
  listing,
  sourceDigest,
  rendererDigest,
}) {
  const payload = JSON.stringify({
    cacheVersion: ACTIVITY_IMAGE_CACHE_VERSION,
    rendererDigest,
    listingId,
    src: listing.src,
    source: listing.source,
    sourceKind: listing.sourceKind || null,
    title: listing.title,
    village: listing.village,
    sourceDigest,
  });

  return createHash('sha256').update(payload).digest('hex');
}

export async function readActivityImageCacheManifest(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, 'utf8'));
    if (
      parsed?.version !== ACTIVITY_IMAGE_CACHE_VERSION
      || !parsed.entries
      || typeof parsed.entries !== 'object'
      || Array.isArray(parsed.entries)
    ) {
      return { version: ACTIVITY_IMAGE_CACHE_VERSION, entries: {} };
    }

    return {
      version: ACTIVITY_IMAGE_CACHE_VERSION,
      entries: parsed.entries,
    };
  } catch {
    return { version: ACTIVITY_IMAGE_CACHE_VERSION, entries: {} };
  }
}

export function isActivityImageCacheHit({
  previousEntry,
  fingerprint,
  src,
  cachedFileExists,
}) {
  return Boolean(
    cachedFileExists
    && previousEntry
    && previousEntry.fingerprint === fingerprint
    && previousEntry.src === src,
  );
}
