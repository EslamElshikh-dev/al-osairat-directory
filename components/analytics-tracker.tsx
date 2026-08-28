'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

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

function trackMutation(path: string, body: Record<string, unknown>) {
  if (path === '/api/auth/register') {
    trackEvent('sign_up', { method: 'password' });
    return;
  }
  if (path === '/api/auth/login') {
    trackEvent('login', { method: 'password' });
    return;
  }
  if (path === '/api/auth/oauth-complete') {
    trackEvent('login', { method: 'google' });
    return;
  }
  if (path === '/api/business-submissions') {
    trackEvent('business_submission', {
      category: stringParam(body.category),
      village: stringParam(body.village),
    });
    return;
  }
  if (path === '/api/ownership-claims') {
    trackEvent('ownership_claim', {
      relationship: stringParam(body.relationship),
      proof_method: stringParam(body.proofMethod),
    });
    return;
  }
  if (path === '/api/listing-reports') {
    trackEvent('listing_report', {
      report_type: stringParam(body.reportType),
    });
    return;
  }
  if (path === '/api/favorites') {
    const action = stringParam(body.action);
    if (action === 'add') trackEvent('favorite_add', { content_type: 'directory_listing' });
    if (action === 'remove') trackEvent('favorite_remove', { content_type: 'directory_listing' });
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith('/listing/')) {
      trackEvent('view_listing', { content_type: 'directory_listing' });
    }
  }, [pathname]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const trackedFetch: typeof window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();

      if (method === 'POST' && response.ok) {
        try {
          const rawUrl = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
          const path = new URL(rawUrl, window.location.origin).pathname;
          trackMutation(path, parseJsonBody(init?.body));
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

      const eventName = classifyLink(link.getAttribute('href') || '');
      if (!eventName) return;

      trackEvent(eventName, {
        content_type: pathname.startsWith('/listing/') ? 'directory_listing' : 'site',
        transport_type: 'beacon',
      });
    }

    function handleSubmit(event: SubmitEvent) {
      const form = event.target as HTMLFormElement | null;
      if (!form?.classList.contains('explorer__tools')) return;

      const data = new FormData(form);
      const query = String(data.get('q') || '').trim();
      const village = String(data.get('village') || 'all');

      trackEvent('directory_search', {
        has_query: Boolean(query),
        query_length: Math.min(query.length, 200),
        village_filter: village === 'all' ? 'all' : village.slice(0, 80),
        category_scope: pathname.startsWith('/directory/') ? pathname.split('/')[2] || 'all' : 'all',
        transport_type: 'beacon',
      });
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
