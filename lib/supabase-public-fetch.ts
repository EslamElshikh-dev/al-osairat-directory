const PUBLIC_REVALIDATE_SECONDS = 60;
const PUBLIC_FETCH_TIMEOUT_MS = 4_500;

type NextFetchOptions = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

function endpointName(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\/rest\/v1\//, '') || parsed.pathname;
  } catch {
    return 'unknown';
  }
}

function errorCode(error: unknown) {
  if (!error || typeof error !== 'object') return '';
  const direct = 'code' in error && typeof error.code === 'string' ? error.code : '';
  if (direct) return direct;
  const cause = 'cause' in error && error.cause && typeof error.cause === 'object'
    ? error.cause
    : null;
  return cause && 'code' in cause && typeof cause.code === 'string' ? cause.code : '';
}

export async function fetchSupabasePublicJson<T>(
  url: string,
  init: NextFetchOptions = {},
): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PUBLIC_FETCH_TIMEOUT_MS);
  const startedAt = Date.now();
  const endpoint = endpointName(url);
  const { next, ...requestInit } = init;

  try {
    const response = await fetch(url, {
      ...requestInit,
      signal: controller.signal,
      ...(init.cache === 'no-store'
        ? {}
        : { next: next ?? { revalidate: PUBLIC_REVALIDATE_SECONDS } }),
    });

    if (!response.ok) {
      console.warn('[supabase-public-fetch]', {
        kind: 'http_error',
        endpoint,
        status: response.status,
        durationMs: Date.now() - startedAt,
      });
      return null;
    }

    return await response.json() as T;
  } catch (error) {
    console.warn('[supabase-public-fetch]', {
      kind: controller.signal.aborted ? 'timeout' : 'network_error',
      endpoint,
      code: errorCode(error),
      durationMs: Date.now() - startedAt,
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
