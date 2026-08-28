export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

function ensureGtag() {
  if (typeof window === 'undefined') return null;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
  }
  return window.gtag;
}

export function trackEvent(name: string, params: AnalyticsParams = {}) {
  const gtag = ensureGtag();
  if (!gtag) return;

  const safeParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );

  gtag('event', name, safeParams);
}
