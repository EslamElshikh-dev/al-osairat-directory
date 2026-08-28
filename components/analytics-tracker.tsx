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

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith('/listing/')) {
      trackEvent('view_listing', { content_type: 'directory_listing' });
    }
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Element | null;
      const link = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!link) return;

      const eventName = classifyLink(link.getAttribute('href') || '');
      if (!eventName) return;

      trackEvent(eventName, {
        content_type: pathname.startsWith('/listing/') ? 'directory_listing' : 'site',
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
        query_length: query.length,
        village_filter: village === 'all' ? 'all' : village,
        category_scope: pathname.startsWith('/directory/') ? pathname.split('/')[2] || 'all' : 'all',
      });
    }

    document.addEventListener('click', handleClick, true);
    document.addEventListener('submit', handleSubmit, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('submit', handleSubmit, true);
    };
  }, [pathname]);

  return null;
}
