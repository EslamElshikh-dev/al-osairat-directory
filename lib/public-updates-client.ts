export type PublicUpdate = {
  id: string;
  type: 'news' | 'job' | 'article';
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
