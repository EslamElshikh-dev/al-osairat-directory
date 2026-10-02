/** Storage can be unavailable in privacy modes. Keep a stable in-memory fallback. */
const memory = new Map<string, string>();
export function analyticsStorage(kind: 'localStorage' | 'sessionStorage', key: string, value?: string) {
  if (value !== undefined) memory.set(key, value);
  try {
    if (value !== undefined) window[kind].setItem(key, value);
    return window[kind].getItem(key) || memory.get(key) || '';
  } catch { return memory.get(key) || ''; }
}

export function isMeasuredPath(path: string) {
  return /^\/(?:[^/]|$)/.test(path) && !/^\/(?:admin|api)(?:\/|$)/.test(path);
}

export function newAnalyticsId() {
  return crypto.randomUUID();
}
