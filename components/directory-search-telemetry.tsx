'use client';

import { useEffect } from 'react';

type DirectorySearchTelemetryProps = {
  query: string;
  village: string;
  category: string;
  resultCount: number;
  pathname: string;
};

const DEDUPE_WINDOW_MS = 3_000;
const STORAGE_KEY = 'osayrat:last-directory-search-result';

export function DirectorySearchTelemetry({
  query,
  village,
  category,
  resultCount,
  pathname,
}: DirectorySearchTelemetryProps) {
  useEffect(() => {
    const cleanQuery = query.trim().slice(0, 120);
    const cleanVillage = village.trim().slice(0, 100) || 'all';
    const cleanCategory = category.trim().slice(0, 100) || 'all';
    if (!cleanQuery && cleanVillage === 'all') return;

    const signature = [pathname, cleanQuery, cleanVillage, cleanCategory, resultCount].join('|');
    const now = Date.now();

    try {
      const previous = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '{}') as {
        signature?: string;
        at?: number;
      };
      if (
        previous.signature === signature
        && Number.isFinite(Number(previous.at))
        && now - Number(previous.at) < DEDUPE_WINDOW_MS
      ) {
        return;
      }
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ signature, at: now }));
    } catch {
      // Telemetry must never interrupt directory browsing.
    }

    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('osayrat:directory-search-result', {
        detail: {
          query: cleanQuery,
          village: cleanVillage,
          category: cleanCategory,
          resultCount: Math.max(0, Math.trunc(resultCount || 0)),
        },
      }));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [category, pathname, query, resultCount, village]);

  return null;
}
