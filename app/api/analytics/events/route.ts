import { NextResponse } from 'next/server';
import { listings } from '@/lib/data';
import { getPublishedListingBySlug } from '@/lib/published-listings';
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  sameOrigin,
} from '@/lib/auth/supabase-rest';
import { normalizeRouteSlug } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedEvents = new Set([
  'directory_search',
  'view_listing',
  'phone_click',
  'whatsapp_click',
  'maps_click',
  'favorite_add',
  'favorite_remove',
]);

function clean(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function safeSearchTerm(value: unknown) {
  const term = clean(value, 120);
  if (!term) return '';
  const email = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const egyptianPhone = /(^|\D)01\d{9}(\D|$)/;
  const longNumber = /\d{7,}/;
  if (email.test(term) || egyptianPhone.test(term) || longNumber.test(term)) return '';
  return term;
}

async function resolveListing(eventType: string, listingId: string, listingSlug: string) {
  if (listingId) {
    const staticListing = listings.find((item) => item.id === listingId);
    return { listingId, listingSlug: staticListing?.slug || listingSlug };
  }

  if (!listingSlug || eventType === 'directory_search') return { listingId: '', listingSlug };
  const normalizedSlug = normalizeRouteSlug(listingSlug);
  const staticListing = listings.find((item) => item.slug === normalizedSlug);
  if (staticListing) return { listingId: staticListing.id, listingSlug: staticListing.slug };

  const published = await getPublishedListingBySlug(normalizedSlug).catch(() => null);
  return published
    ? { listingId: published.id, listingSlug: published.slug }
    : { listingId: '', listingSlug: normalizedSlug };
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
    return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const eventType = clean(body?.eventType, 40);
  const sessionId = clean(body?.sessionId, 80);
  if (!allowedEvents.has(eventType) || !/^[A-Za-z0-9_-]{8,80}$/.test(sessionId)) {
    return NextResponse.json({ error: 'حدث غير صالح.' }, { status: 400 });
  }

  const listing = await resolveListing(
    eventType,
    clean(body?.listingId, 180),
    clean(body?.listingSlug, 180),
  );

  if (eventType !== 'directory_search' && !listing.listingId) {
    return NextResponse.json({ accepted: false }, { status: 202 });
  }

  const resultCountValue = Number(body?.resultCount);
  const payload = {
    event_type: eventType,
    session_id: sessionId,
    listing_id: listing.listingId || null,
    listing_slug: listing.listingSlug || null,
    search_term: eventType === 'directory_search' ? safeSearchTerm(body?.searchTerm) || null : null,
    village: eventType === 'directory_search' ? clean(body?.village, 100) || null : null,
    category: eventType === 'directory_search' ? clean(body?.category, 100) || null : null,
    result_count: eventType === 'directory_search' && Number.isFinite(resultCountValue)
      ? Math.max(0, Math.min(100000, Math.trunc(resultCountValue)))
      : null,
    source_path: clean(body?.sourcePath, 240) || null,
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/directory_analytics_events`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    return NextResponse.json({ accepted: false }, { status: 202 });
  }
  return NextResponse.json({ accepted: true }, { status: 201 });
}
