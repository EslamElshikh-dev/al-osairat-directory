export type PublicUpdate = {
  id: string;
  type: 'news' | 'job' | 'article' | 'activity';
  title: string;
  summary: string;
  href: string;
  publishedAt: string;
};

const CACHE_MS = 120_000;
let pending: Promise<PublicUpdate[]> | undefined;
let expiresAt = 0;

// The ticker and notification panel share one request per refresh window.
export function loadPublicUpdates(): Promise<PublicUpdate[]> {
  if (pending && Date.now() < expiresAt) return pending;

  pending = fetch('/api/public-updates')
    .then(async (response) => {
      if (!response.ok) throw new Error('UPDATES_UNAVAILABLE');
      const data: { updates?: PublicUpdate[] } = await response.json();
      return Array.isArray(data.updates) ? data.updates : [];
    })
    .catch((error) => {
      pending = undefined;
      expiresAt = 0;
      throw error;
    });
  expiresAt = Date.now() + CACHE_MS;
  return pending;
}

export const PUBLIC_UPDATES_SEEN_KEY = 'osairat:public-updates:seen:v1';

export function parseSeenUpdateIds(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw || '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(-100) : [];
  } catch { return []; }
}
