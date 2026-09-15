import { NextResponse } from 'next/server';
import { categories, listings, villageBySlug } from '@/lib/data';
import { getPublishedListingById, getPublishedListingBySlug } from '@/lib/published-listings';
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  sameOrigin,
} from '@/lib/auth/supabase-rest';
import { normalizeRouteSlug } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedEvents = new Set([
  'page_view',
  'directory_search',
  'view_listing',
  'phone_click',
  'whatsapp_click',
  'maps_click',
  'favorite_add',
  'favorite_remove',
]);

const listingOptionalEvents = new Set([
  'page_view',
  'directory_search',
  'phone_click',
  'whatsapp_click',
  'maps_click',
]);

const categoryIds = new Set(categories.map((item) => item.id));

type ResolvedListing = {
  listingId: string;
  listingSlug: string;
  village: string;
  category: string;
};

function emptyListing(listingSlug = ''): ResolvedListing {
  return { listingId: '', listingSlug, village: '', category: '' };
}

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

function safeUrl(value: unknown, maxLength = 500) {
  const raw = clean(value, maxLength);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    parsed.username = '';
    parsed.password = '';
    return parsed.toString().slice(0, maxLength);
  } catch {
    return '';
  }
}

function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function inferPathContext(sourcePath: string) {
  const parts = sourcePath.split('/').filter(Boolean).map(decodeSegment);
  let village = '';
  let category = '';

  if (parts[0] === 'directory' && parts[1] && categoryIds.has(parts[1] as never)) {
    category = parts[1];
  }

  if (parts[0] === 'villages' && parts[1]) {
    const villageInfo = villageBySlug[normalizeRouteSlug(parts[1])];
    village = villageInfo?.name || '';
    if (parts[2] && categoryIds.has(parts[2] as never)) category = parts[2];
  }

  if (parts[0] === 'emergency') category = 'emergency';
  if (parts[0] === 'transport') category = 'transport';

  return { village, category };
}

async function resolveListing(eventType: string, listingId: string, listingSlug: string): Promise<ResolvedListing> {
  if (listingId) {
    const staticListing = listings.find((item) => item.id === listingId);
    if (staticListing) {
      return {
        listingId: staticListing.id,
        listingSlug: staticListing.slug,
        village: staticListing.village,
        category: staticListing.category,
      };
    }

    const publishedById = await getPublishedListingById(listingId).catch(() => null);
    if (publishedById) {
      return {
        listingId: publishedById.id,
        listingSlug: publishedById.slug,
        village: publishedById.village,
        category: publishedById.category,
      };
    }
  }

  if (!listingSlug || eventType === 'directory_search') return emptyListing(listingSlug);

  const normalizedSlug = normalizeRouteSlug(listingSlug);
  const staticListing = listings.find((item) => item.slug === normalizedSlug);
  if (staticListing) {
    return {
      listingId: staticListing.id,
      listingSlug: staticListing.slug,
      village: staticListing.village,
      category: staticListing.category,
    };
  }

  const published = await getPublishedListingBySlug(normalizedSlug).catch(() => null);
  return published
    ? {
        listingId: published.id,
        listingSlug: published.slug,
        village: published.village,
        category: published.category,
      }
    : emptyListing(normalizedSlug);
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
  const visitorId = clean(body?.visitorId, 80);
  if (
    !allowedEvents.has(eventType)
    || !/^[A-Za-z0-9_-]{8,80}$/.test(sessionId)
    || !/^[A-Za-z0-9_-]{8,80}$/.test(visitorId)
  ) {
    return NextResponse.json({ error: 'حدث غير صالح.' }, { status: 400 });
  }

  const searchTerm = eventType === 'directory_search' ? safeSearchTerm(body?.searchTerm) : '';
  const searchVillage = eventType === 'directory_search' ? clean(body?.village, 100) || 'all' : '';
  const searchCategory = eventType === 'directory_search' ? clean(body?.category, 100) || 'all' : '';

  if (eventType === 'directory_search' && !searchTerm && searchVillage === 'all') {
    return NextResponse.json({ accepted: false }, { status: 202 });
  }

  const listing = await resolveListing(
    eventType,
    clean(body?.listingId, 180),
    clean(body?.listingSlug, 180),
  );

  if (!listingOptionalEvents.has(eventType) && !listing.listingId) {
    return NextResponse.json({ accepted: false }, { status: 202 });
  }

  const sourcePath = clean(body?.sourcePath, 240);
  const pathContext = inferPathContext(sourcePath);
  const requestVillage = clean(body?.village, 100);
  const requestCategory = clean(body?.category, 100);

  const eventVillage = eventType === 'directory_search'
    ? (searchVillage !== 'all' ? searchVillage : pathContext.village)
    : (listing.village || requestVillage || pathContext.village);
  const eventCategory = eventType === 'directory_search'
    ? (searchCategory !== 'all' ? searchCategory : pathContext.category)
    : (listing.category || requestCategory || pathContext.category);

  const resultCountValue = Number(body?.resultCount);
  const payload = {
    event_type: eventType,
    session_id: sessionId,
    visitor_id: visitorId,
    listing_id: listing.listingId || null,
    listing_slug: listing.listingSlug || null,
    search_term: eventType === 'directory_search' ? searchTerm || null : null,
    village: eventVillage || null,
    category: eventCategory || null,
    result_count: eventType === 'directory_search' && Number.isFinite(resultCountValue)
      ? Math.max(0, Math.min(100000, Math.trunc(resultCountValue)))
      : null,
    source_path: sourcePath || null,
    page_url: safeUrl(body?.pageUrl) || null,
    referrer: safeUrl(body?.referrer) || null,
    utm_source: clean(body?.utmSource, 120) || null,
    utm_medium: clean(body?.utmMedium, 120) || null,
    utm_campaign: clean(body?.utmCampaign, 180) || null,
    utm_term: clean(body?.utmTerm, 180) || null,
    utm_content: clean(body?.utmContent, 180) || null,
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
