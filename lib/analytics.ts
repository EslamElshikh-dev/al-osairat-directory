export type AnalyticsParams = Record<string, string | number | boolean | undefined>;
export type AnalyticsEventOptions = { immediate?: boolean };

export const GA_MEASUREMENT_ID = 'G-3768S94PP1';
const GA_SCRIPT_SELECTOR = 'script[data-osayrat-ga4]';
const GA_SCRIPT_URL = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let configured = false;
let loaded = false;
let loadPromise: Promise<void> | null = null;

function ensureGtag() {
  if (typeof window === 'undefined') return null;

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer?.push(arguments);
    };
  }

  if (!configured) {
    configured = true;
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_location: window.location.href,
      page_title: document.title,
    });
  }

  return window.gtag;
}

export function initializeAnalyticsQueue() {
  ensureGtag();
}

export function isGoogleAnalyticsLoaded() {
  return loaded;
}

export function loadGoogleAnalytics() {
  if (typeof window === 'undefined') return Promise.resolve();

  ensureGtag();
  if (loaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const existing = document.querySelector<HTMLScriptElement>(GA_SCRIPT_SELECTOR);

  loadPromise = new Promise<void>((resolve) => {
    const script = existing || document.createElement('script');

    const finish = () => {
      loaded = true;
      resolve();
    };

    const fail = () => {
      loadPromise = null;
      resolve();
    };

    if (existing) {
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', fail, { once: true });
      return;
    }

    script.async = true;
    script.src = GA_SCRIPT_URL;
    script.dataset.osayratGa4 = 'true';
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', fail, { once: true });
    document.head.appendChild(script);
  }).finally(() => {
    if (loaded) loadPromise = null;
  });

  return loadPromise;
}

export function trackPageViewBeforeGoogleLoads(pageReferrer?: string) {
  if (typeof window === 'undefined' || loaded) return false;
  const gtag = ensureGtag();
  if (!gtag) return false;

  gtag('event', 'page_view', {
    page_location: window.location.href,
    page_title: document.title,
    ...(pageReferrer ? { page_referrer: pageReferrer } : {}),
  });
  return true;
}

export function trackEvent(
  name: string,
  params: AnalyticsParams = {},
  options: AnalyticsEventOptions = {},
) {
  const gtag = ensureGtag();
  if (!gtag) return;

  const safeParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
  );

  gtag('event', name, safeParams);

  if (options.immediate) {
    void loadGoogleAnalytics();
  }
}
