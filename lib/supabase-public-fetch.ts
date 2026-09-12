const PUBLIC_REVALIDATE_SECONDS = 60;
const PUBLIC_FETCH_TIMEOUT_MS = 4_500;

export async function fetchSupabasePublicJson<T>(
  url: string,
  init: RequestInit = {},
): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PUBLIC_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      next: { revalidate: PUBLIC_REVALIDATE_SECONDS },
    });

    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
