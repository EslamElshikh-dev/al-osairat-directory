'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import {
  initializeAnalyticsQueue,
  isGoogleAnalyticsLoaded,
  trackEvent,
  trackPageViewBeforeGoogleLoads,
} from '@/lib/analytics';

type OperationalEvent = {
  eventType: string;
  listingId?: string;
  listingSlug?: string;
  searchTerm?: string;
  village?: string;
  category?: string;
  resultCount?: number;
};

type Attribution = {
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
};

type PendingDirectorySearch = {
  query: string;
  village: string;
  category: string;
  pathname: string;
  createdAt: number;
};

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

const reportWebVital: ReportWebVitalsCallback = (metric) => {
  if (typeof window === 'undefined') return;

  const metricName = metric.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 16);
  const rating = metric.rating.replace(/[^a-z0-9]+/g, '_').slice(0, 24);
  if (!metricName || !rating) return;

  const scale = metric.name === 'CLS' ? 1000 : 1;
  trackEvent(`web_vital_${metricName}_${rating}`, {
    value: Math.round(metric.value * scale),
    metric_delta: Math.round(metric.delta * scale),
    metric_id: metric.id.slice(0, 80),
    navigation_type: metric.navigationType,
    non_interaction: true,
  });
};

function classifyLink(href: string) {
  const value = href.trim().toLowerCase();
  if (value.startsWith('tel:')) return 'phone_click';
  if (value.includes('wa.me/') || value.includes('api.whatsapp.com/') || value.includes('whatsapp.com/send')) return 'whatsapp_click';
  if (value.includes('google.com/maps') || value.includes('maps.google.') || value.includes('maps.app.goo.gl') || value.includes('goo.gl/maps')) return 'maps_click';
  return '';
}

function parseJsonBody(body: BodyInit | null | undefined) {
  if (typeof body !== 'string') return {} as Record<string, unknown>;
  try {
    const value = JSON.parse(body);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {} as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

function stringParam(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 80) : '';
}

function createClientId() {
  return typeof crypto?.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 18)}`;
}

function operationalSessionId() {
  if (typeof window === 'undefined') return '';
  const key = 'osayrat:analytics-session';
  const existing = window.sessionStorage.getItem(key);
  if (existing && /^[A-Za-z0-9_-]{8,80}$/.test(existing)) return existing;
  const created = createClientId();
  window.sessionStorage.setItem(key, created);
  return created;
}

function operationalVisitorId() {
  if (typeof window === 'undefined') return '';
  const key = 'osayrat:analytics-visitor';
  const existing = window.localStorage.getItem(key);
  if (existing && /^[A-Za-z0-9_-]{8,80}$/.test(existing)) return existing;
  const created = createClientId();
  window.localStorage.setItem(key, created);
  return created;
}

function getAttribution(): Attribution {
  if (typeof window === 'undefined') {
    return { referrer: '', utmSource: '', utmMedium: '', utmCampaign: '', utmTerm: '', utmContent: '' };
  }

  const key = 'osayrat:analytics-attribution';
  const existing = window.sessionStorage.getItem(key);
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as Attribution;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // Rebuild corrupt attribution below.
    }
  }

  const params = new URLSearchParams(window.location.search);
  const created: Attribution = {
    referrer: document.referrer || '',
    utmSource: String(params.get('utm_source') || '').slice(0, 120),
    utmMedium: String(params.get('utm_medium') || '').slice(0, 120),
    utmCampaign: String(params.get('utm_campaign') || '').slice(0, 180),
    utmTerm: String(params.get('utm_term') || '').slice(0, 180),
    utmContent: String(params.get('utm_content') || '').slice(0, 180),
  };
  window.sessionStorage.setItem(key, JSON.stringify(created));
  return created;
}

function sendOperationalEvent(event: OperationalEvent) {
  if (typeof window === 'undefined') return;
  const sessionId = operationalSessionId();
  const visitorId = operationalVisitorId();
  if (!sessionId || !visitorId) return;
  const attribution = getAttribution();

  void window.fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    keepalive: true,
    body: JSON.stringify({
      ...event,
      sessionId,
      visitorId,
      sourcePath: window.location.pathname,
      pageUrl: `${window.location.origin}${window.location.pathname}`,
      ...attribution,
    }),
  }).catch(() => null);
}

function listingSlugFromPath(pathname: string) {
  if (!pathname.startsWith('/listing/')) return '';
  return decodeURIComponent(pathname.split('/')[2] || '').slice(0, 180);
}

function parseArabicNumber(value: string) {
  const western = value
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[٬,\s]/g, '');
  const parsed = Number(western);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function savePendingDirectorySearch(pending: PendingDirectorySearch) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem('osayrat:pending-directory-search', JSON.stringify(pending));
}

function consumePendingDirectorySearch(pathname: string) {
  if (typeof window === 'undefined') return null;
  const key = 'osayrat:pending-directory-search';
  const raw = window.sessionStorage.getItem(key);
  if (!raw) return null;

  try {
    const pending = JSON.parse(raw) as PendingDirectorySearch;
    const isFresh = Date.now() - Number(pending.createdAt || 0) < 30_000;
    if (!isFresh || pending.pathname !== pathname) return null;
    window.sessionStorage.removeItem(key);
    return pending;
  } catch {
    window.sessionStorage.removeItem(key);
    return null;
  }
}

function trackMutation(path: string, body: Record<string, unknown>) {
  if (path === '/api/auth/register') {
    trackEvent('sign_up', { method: 'password' }, { immediate: true });
    return;
  }
  if (path === '/api/auth/login') {
    trackEvent('login', { method: 'password' }, { immediate: true });
    return;
  }
  if (path === '/api/auth/oauth-complete') {
    trackEvent('login', { method: 'google' }, { immediate: true });
    return;
  }
  if (path === '/api/business-submissions') {
    trackEvent('business_submission', {
      category: stringParam(body.category),
      village: stringParam(body.village),
    }, { immediate: true });
    return;
  }
  if (path === '/api/ownership-claims') {
    trackEvent('ownership_claim', {
      relationship: stringParam(body.relationship),
      proof_method: stringParam(body.proofMethod),
    }, { immediate: true });
    return;
  }
  if (path === '/api/listing-reports') {
    trackEvent('listing_report', {
      report_type: stringParam(body.reportType),
    }, { immediate: true });
    return;
  }
  if (path === '/api/favorites') {
    const action = stringParam(body.action);
    const listingId = stringParam(body.listingId);
    if (action === 'add') {
      trackEvent('favorite_add', { content_type: 'directory_listing' }, { immediate: true });
      if (listingId) sendOperationalEvent({ eventType: 'favorite_add', listingId });
    }
    if (action === 'remove') {
      trackEvent('favorite_remove', { content_type: 'directory_listing' }, { immediate: true });
      if (listingId) sendOperationalEvent({ eventType: 'favorite_remove', listingId });
    }
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const previousPageUrl = useRef<string | null>(null);

  useReportWebVitals(reportWebVital);

  useEffect(() => {
    initializeAnalyticsQueue();
    operationalVisitorId();
    operationalSessionId();
    getAttribution();
    previousPageUrl.current = window.location.href;
  }, []);

  useEffect(() => {
    const currentUrl = window.location.href;
    const previousUrl = previousPageUrl.current;

    if (previousUrl && previousUrl !== currentUrl && !isGoogleAnalyticsLoaded()) {
      trackPageViewBeforeGoogleLoads(previousUrl);
    }
    previousPageUrl.current = currentUrl;

    sendOperationalEvent({ eventType: 'page_view' });

    if (pathname.startsWith('/listing/')) {
      const listingSlug = listingSlugFromPath(pathname);
      trackEvent('view_listing', { content_type: 'directory_listing' });
      if (listingSlug) sendOperationalEvent({ eventType: 'view_listing', listingSlug });
    }

    if (pathname === '/directory' || pathname.startsWith('/directory/')) {
      const pending = consumePendingDirectorySearch(pathname);
      if (pending) {
        window.setTimeout(() => {
          const resultText = document.querySelector('.results-bar strong')?.textContent || '0';
          sendOperationalEvent({
            eventType: 'directory_search',
            searchTerm: pending.query,
            village: pending.village,
            category: pending.category,
            resultCount: parseArabicNumber(resultText),
          });
        }, 0);
      }
    }
  }, [pathname, searchKey]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const trackedFetch: typeof window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();

      if (method === 'POST' && response.ok) {
        try {
          const rawUrl = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
          const path = new URL(rawUrl, window.location.origin).pathname;
          if (path !== '/api/analytics/events') trackMutation(path, parseJsonBody(init?.body));
        } catch {
          // Analytics must never interfere with a successful product action.
        }
      }

      return response;
    };

    window.fetch = trackedFetch;

    function handleClick(event: MouseEvent) {
      const target = event.target as Element | null;
      const link = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!link) return;

      const newsDetail = stringParam(link.dataset.newsDetail);
      if (newsDetail) {
        trackEvent('news_detail_open', {
          news_id: newsDetail,
          topic: stringParam(link.dataset.newsTopic),
          village: stringParam(link.dataset.newsVillage),
          transport_type: 'beacon',
        }, { immediate: true });
        return;
      }

      const newsSource = stringParam(link.dataset.newsSource);
      if (newsSource) {
        trackEvent('news_source_click', {
          source: newsSource,
          topic: stringParam(link.dataset.newsTopic),
          village: stringParam(link.dataset.newsVillage),
          transport_type: 'beacon',
        }, { immediate: true });
        return;
      }

      const eventName = classifyLink(link.getAttribute('href') || '');
      if (!eventName) return;

      const listingSlug = listingSlugFromPath(pathname);
      trackEvent(eventName, {
        content_type: listingSlug ? 'directory_listing' : 'site',
        transport_type: 'beacon',
      }, { immediate: true });
      sendOperationalEvent({
        eventType: eventName,
        ...(listingSlug ? { listingSlug } : {}),
      });
    }

    function handleSubmit(event: SubmitEvent) {
      const form = event.target as HTMLFormElement | null;
      if (!form?.classList.contains('explorer__tools')) return;

      const data = new FormData(form);
      const query = String(data.get('q') || '').trim().slice(0, 120);
      const village = String(data.get('village') || 'all').trim().slice(0, 100) || 'all';
      const category = pathname.startsWith('/directory/') ? pathname.split('/')[2] || 'all' : 'all';

      // Do not treat an empty/default submit as a search.
      if (!query && village === 'all') return;

      savePendingDirectorySearch({
        query,
        village,
        category,
        pathname,
        createdAt: Date.now(),
      });

      trackEvent('directory_search', {
        has_query: Boolean(query),
        query_length: Math.min(query.length, 200),
        village_filter: village === 'all' ? 'all' : village.slice(0, 80),
        category_scope: category,
        transport_type: 'beacon',
      }, { immediate: true });
    }

    document.addEventListener('click', handleClick, true);
    document.addEventListener('submit', handleSubmit, true);
    return () => {
      if (window.fetch === trackedFetch) window.fetch = originalFetch;
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('submit', handleSubmit, true);
    };
  }, [pathname]);

  return null;
}
