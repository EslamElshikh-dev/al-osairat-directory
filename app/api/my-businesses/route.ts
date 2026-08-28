import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { categoryById, listings, villages, type DirectoryListing } from '@/lib/data';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
import {
  isValidEgyptianMobile,
  isValidEgyptianPhone,
  normalizeEgyptianPhone,
  normalizeGoogleMapsUrl,
} from '@/lib/business-submission-validation';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  authCookieBase,
  getUser,
  mapMember,
  refreshSession,
  sameOrigin,
} from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ReviewStatus = 'pending' | 'needs_changes' | 'approved' | 'rejected';
type OwnershipRow = { listing_id: string; relationship: string; approved_at: string };
type ChangeRow = {
  id: string;
  listing_id: string;
  snapshot: Record<string, unknown>;
  changes: Record<string, unknown>;
  status: ReviewStatus;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  applied_at: string | null;
};

type ResolvedSession = {
  accessToken: string;
  userId: string;
  emailVerified: boolean;
  refreshed?: { accessToken: string; refreshToken: string; expiresIn: number };
};

const villageNames = new Set(villages.filter((item) => item.name !== 'مركز العسيرات').map((item) => item.name));

function restHeaders(accessToken: string, json = false) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function resolveSession(): Promise<ResolvedSession | null> {
  const store = await cookies();
  const accessToken = store.get(AUTH_ACCESS_COOKIE)?.value;
  const refreshToken = store.get(AUTH_REFRESH_COOKIE)?.value;
  if (accessToken) {
    try {
      const member = mapMember(await getUser(accessToken));
      return { accessToken, userId: member.localId, emailVerified: member.emailVerified };
    } catch {}
  }
  if (!refreshToken) return null;
  try {
    const session = await refreshSession(refreshToken);
    const member = mapMember(session.user);
    return {
      accessToken: session.access_token,
      userId: member.localId,
      emailVerified: member.emailVerified,
      refreshed: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresIn: session.expires_in || 3600,
      },
    };
  } catch {
    return null;
  }
}

function respond(payload: unknown, session: ResolvedSession | null, status = 200) {
  const response = NextResponse.json(payload, { status });
  if (session?.refreshed) {
    response.cookies.set(AUTH_ACCESS_COOKIE, session.refreshed.accessToken, {
      ...authCookieBase,
      maxAge: Math.max(300, session.refreshed.expiresIn - 60),
    });
    response.cookies.set(AUTH_REFRESH_COOKIE, session.refreshed.refreshToken, {
      ...authCookieBase,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}

function clean(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function cleanMultiline(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').slice(0, maxLength);
}

async function getLiveListings() {
  const [staticListings, published] = await Promise.all([
    applyListingOverrides(listings),
    getPublishedListings(),
  ]);
  const index = new Map<string, DirectoryListing>();
  [...staticListings, ...published].forEach((item) => index.set(item.id, item));
  return Array.from(index.values());
}

function editableSnapshot(listing: DirectoryListing) {
  return {
    title: listing.title,
    subCategory: listing.subCategory || '',
    location: listing.location,
    village: listing.village,
    locality: listing.locality || '',
    phone: listing.phone || '',
    whatsapp: listing.whatsapp || '',
    hours: listing.hours || '',
    description: listing.description || '',
    googleMapsUrl: listing.googleMapsUrl || '',
  };
}

function serializeBusiness(listing: DirectoryListing, ownership: OwnershipRow) {
  return {
    listingId: listing.id,
    slug: listing.slug,
    title: listing.title,
    category: listing.category,
    categoryLabel: categoryById[listing.category].shortLabel,
    subCategory: listing.subCategory || '',
    location: listing.location,
    village: listing.village,
    locality: listing.locality || '',
    phone: listing.phone || '',
    whatsapp: listing.whatsapp || '',
    hours: listing.hours || '',
    description: listing.description || '',
    googleMapsUrl: listing.googleMapsUrl || '',
    relationship: ownership.relationship,
    approvedAt: ownership.approved_at,
  };
}

export async function GET() {
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });

  try {
    const [ownershipResponse, changesResponse, liveListings] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/listing_ownerships?select=listing_id,relationship,approved_at&order=approved_at.desc`, {
        headers: restHeaders(session.accessToken), cache: 'no-store',
      }),
      fetch(`${SUPABASE_URL}/rest/v1/listing_change_requests?select=id,listing_id,snapshot,changes,status,review_note,created_at,updated_at,reviewed_at,applied_at&order=created_at.desc`, {
        headers: restHeaders(session.accessToken), cache: 'no-store',
      }),
      getLiveListings(),
    ]);
    if (!ownershipResponse.ok || !changesResponse.ok) throw new Error('READ_FAILED');

    const ownerships = await ownershipResponse.json() as OwnershipRow[];
    const changes = await changesResponse.json() as ChangeRow[];
    const listingIndex = new Map(liveListings.map((item) => [item.id, item]));

    return respond({
      businesses: ownerships.flatMap((ownership) => {
        const listing = listingIndex.get(ownership.listing_id);
        return listing ? [serializeBusiness(listing, ownership)] : [];
      }),
      requests: changes.map((row) => ({
        id: row.id,
        listingId: row.listing_id,
        listingTitle: listingIndex.get(row.listing_id)?.title || String(row.snapshot?.title || 'نشاط'),
        snapshot: row.snapshot,
        changes: row.changes,
        status: row.status,
        reviewNote: row.review_note || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        reviewedAt: row.reviewed_at,
        appliedAt: row.applied_at,
      })),
    }, session);
  } catch {
    return respond({ error: 'تعذر تحميل أنشطتك الآن.' }, session, 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });
  if (!session.emailVerified) return respond({ error: 'أكد بريدك الإلكتروني قبل إرسال طلب تعديل.' }, session, 403);

  const body = await request.json().catch(() => ({}));
  const listingId = clean(body?.listingId, 180);
  const liveListings = await getLiveListings();
  const listing = liveListings.find((item) => item.id === listingId);
  if (!listing) return respond({ error: 'النشاط غير موجود أو لم يعد منشورًا.' }, session, 404);

  const ownershipResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/listing_ownerships?select=listing_id&listing_id=eq.${encodeURIComponent(listingId)}&limit=1`,
    { headers: restHeaders(session.accessToken), cache: 'no-store' },
  );
  if (!ownershipResponse.ok) return respond({ error: 'تعذر التحقق من ملكية النشاط.' }, session, 500);
  const owned = await ownershipResponse.json() as Array<{ listing_id: string }>;
  if (!owned.length) return respond({ error: 'لا يمكنك تعديل نشاط قبل اعتماد ملكيته لحسابك.' }, session, 403);

  const finalState = {
    title: clean(body?.title, 120),
    subCategory: clean(body?.subCategory, 120),
    location: clean(body?.location, 240),
    village: clean(body?.village, 80),
    locality: clean(body?.locality, 100),
    phone: normalizeEgyptianPhone(body?.phone),
    whatsapp: normalizeEgyptianPhone(body?.whatsapp),
    hours: clean(body?.hours, 180),
    description: cleanMultiline(body?.description, 800),
    googleMapsUrl: clean(body?.googleMapsUrl, 500),
  };

  if (finalState.title.length < 2) return respond({ error: 'اكتب اسم النشاط بشكل صحيح.' }, session, 400);
  if (finalState.location.length < 3) return respond({ error: 'اكتب وصفًا واضحًا لموقع النشاط.' }, session, 400);
  if (!villageNames.has(finalState.village)) return respond({ error: 'اختر قرية من قرى مركز العسيرات.' }, session, 400);
  if (finalState.phone && !isValidEgyptianPhone(finalState.phone)) return respond({ error: 'رقم الهاتف غير صحيح.' }, session, 400);
  if (finalState.whatsapp && !isValidEgyptianMobile(finalState.whatsapp)) return respond({ error: 'رقم واتساب غير صحيح.' }, session, 400);
  if (finalState.googleMapsUrl) {
    const normalizedMaps = normalizeGoogleMapsUrl(finalState.googleMapsUrl);
    if (!normalizedMaps) return respond({ error: 'رابط خرائط Google غير صحيح.' }, session, 400);
    finalState.googleMapsUrl = normalizedMaps;
  }
  if (!finalState.phone && !finalState.whatsapp && !finalState.googleMapsUrl) {
    return respond({ error: 'اترك وسيلة تواصل واحدة على الأقل: هاتف أو واتساب أو رابط خرائط.' }, session, 400);
  }

  const snapshot = editableSnapshot(listing);
  const changes: Record<string, string> = {};
  (Object.keys(finalState) as Array<keyof typeof finalState>).forEach((key) => {
    if (finalState[key] !== snapshot[key]) changes[key] = finalState[key];
  });
  if (!Object.keys(changes).length) return respond({ error: 'لم تغيّر أي بيانات في النشاط.' }, session, 400);

  try {
    const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_listing_change`, {
      method: 'POST',
      headers: restHeaders(session.accessToken, true),
      body: JSON.stringify({ p_listing_id: listingId, p_snapshot: snapshot, p_changes: changes }),
      cache: 'no-store',
    });
    if (!rpcResponse.ok) {
      const text = await rpcResponse.text();
      if (text.includes('OPEN_REQUEST_EXISTS') || rpcResponse.status === 409) {
        return respond({ error: 'لديك طلب تعديل مفتوح بالفعل لهذا النشاط.' }, session, 409);
      }
      if (text.includes('OWNERSHIP_REQUIRED')) return respond({ error: 'ملكية النشاط غير معتمدة لهذا الحساب.' }, session, 403);
      throw new Error('CREATE_FAILED');
    }
    const created = await rpcResponse.json();
    return respond({ saved: true, request: created }, session, 201);
  } catch {
    return respond({ error: 'تعذر إرسال طلب التعديل الآن.' }, session, 500);
  }
}
