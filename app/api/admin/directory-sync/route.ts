import { NextResponse } from 'next/server';
import { listings } from '@/lib/data';
import { mergeDirectoryListings } from '@/lib/directory-query';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
import { sameOrigin, SUPABASE_URL } from '@/lib/auth/supabase-rest';
import { adminJson, adminRestHeaders, resolveAdminSession } from '@/lib/auth/admin-server';
import type { DirectoryListing } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SyncResult = {
  entitiesUpserted?: number;
  sourcesInserted?: number;
  activeEntities?: number;
};

function entityPayload(listing: DirectoryListing, origin: 'static' | 'published') {
  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    category: listing.category,
    sub_category: listing.subCategory || null,
    location: listing.location,
    village: listing.village,
    locality: listing.locality || null,
    phone: listing.phone || null,
    whatsapp: listing.whatsapp || null,
    hours: listing.hours || null,
    description: listing.description || null,
    rating: listing.rating ?? null,
    review_count: listing.reviewCount || 0,
    rating_source: listing.ratingSource || null,
    source: listing.source,
    source_status: listing.sourceStatus,
    delivery_available: listing.deliveryAvailable ?? null,
    emergency: Boolean(listing.emergency),
    google_place_id: listing.googlePlaceId || null,
    google_maps_plus_code: listing.googleMapsPlusCode || null,
    google_maps_url: listing.googleMapsUrl || null,
    last_updated_at: listing.lastUpdatedAt || null,
    origin,
  };
}

function sourcePayloads(listing: DirectoryListing) {
  const checkedAt = listing.lastUpdatedAt || null;
  const sources = [
    {
      entity_id: listing.id,
      source_type: listing.source,
      source_status: listing.sourceStatus,
      source_label: listing.source === 'legacy_directory' ? 'بيانات الدليل الأساسية' : listing.source === 'user_collected' ? 'مساهمة عضو تمت مراجعتها' : 'Google Maps',
      source_key: listing.id,
      source_url: listing.source === 'google_maps' ? listing.googleMapsUrl || null : null,
      is_primary: true,
      checked_at: checkedAt,
    },
  ];

  if (listing.googleMapsUrl && listing.source !== 'google_maps') {
    sources.push({
      entity_id: listing.id,
      source_type: 'google_maps',
      source_status: listing.sourceStatus === 'google_verified' ? 'google_verified' : 'cross_checked',
      source_label: 'رابط Google Maps مرتبط بالسجل',
      source_key: listing.googlePlaceId || listing.id,
      source_url: listing.googleMapsUrl,
      is_primary: false,
      checked_at: checkedAt,
    });
  }

  return sources;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير صالح.' }, { status: 403 });

  const session = await resolveAdminSession();
  if (!session) return NextResponse.json({ error: 'غير مصرح بتنفيذ مزامنة الدليل.' }, { status: 403 });

  try {
    const [baseListings, publishedListings] = await Promise.all([
      applyListingOverrides(listings),
      getPublishedListings(),
    ]);

    const publishedIds = new Set(publishedListings.map((listing) => listing.id));
    const allListings = mergeDirectoryListings(baseListings, publishedListings);
    const entities = allListings.map((listing) => entityPayload(listing, publishedIds.has(listing.id) ? 'published' : 'static'));
    const sources = allListings.flatMap(sourcePayloads);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sync_directory_entities`, {
      method: 'POST',
      headers: adminRestHeaders(session.accessToken, true),
      body: JSON.stringify({ p_entities: entities, p_sources: sources }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('DIRECTORY_CANONICAL_SYNC_FAILED', response.status, detail.slice(0, 500));
      return adminJson({ error: 'تعذر مزامنة طبقة البيانات المركزية الآن.' }, session, 502);
    }

    const result = await response.json() as SyncResult;
    return adminJson({
      ok: true,
      synced: entities.length,
      sources: sources.length,
      activeEntities: Number(result.activeEntities || entities.length),
    }, session);
  } catch (error) {
    console.error('DIRECTORY_CANONICAL_SYNC_ERROR', error);
    return adminJson({ error: 'حدث خطأ أثناء تجهيز بيانات المزامنة.' }, session, 500);
  }
}
