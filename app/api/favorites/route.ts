import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { categoryById, listings } from '@/lib/data';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListingById, getPublishedListings } from '@/lib/published-listings';
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

type FavoriteRow = { listing_id: string; created_at: string };

type ResolvedSession = {
  accessToken: string;
  userId: string;
  refreshed?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};

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
      const user = mapMember(await getUser(accessToken));
      return { accessToken, userId: user.localId };
    } catch {
      // Try the refresh token below.
    }
  }

  if (!refreshToken) return null;

  try {
    const session = await refreshSession(refreshToken);
    const user = mapMember(session.user);
    return {
      accessToken: session.access_token,
      userId: user.localId,
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

async function readFavorites(accessToken: string) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/favorites?select=listing_id,created_at&order=created_at.desc`,
    { headers: restHeaders(accessToken), cache: 'no-store' },
  );
  if (!response.ok) throw new Error('FAVORITES_READ_FAILED');
  return response.json() as Promise<FavoriteRow[]>;
}

export async function GET(request: Request) {
  const session = await resolveSession();
  if (!session) return NextResponse.json({ authenticated: false, ids: [] }, { status: 401 });

  try {
    const rows = await readFavorites(session.accessToken);
    const ids = rows.map((row) => row.listing_id);
    const includeItems = new URL(request.url).searchParams.get('include') === 'items';

    if (!includeItems) return respond({ authenticated: true, ids }, session);

    const [publishedListings, staticListings] = await Promise.all([
      getPublishedListings(),
      applyListingOverrides(listings),
    ]);
    const listingIndex = new Map([...staticListings, ...publishedListings].map((listing) => [listing.id, listing]));
    const items = rows.flatMap((row) => {
      const listing = listingIndex.get(row.listing_id);
      if (!listing) return [];
      return [{
        listingId: listing.id,
        slug: listing.slug,
        title: listing.title,
        category: listing.category,
        categoryLabel: categoryById[listing.category].shortLabel,
        location: listing.location,
        village: listing.village,
        createdAt: row.created_at,
      }];
    });

    return respond({ authenticated: true, ids, items }, session);
  } catch {
    return respond({ error: 'تعذر تحميل المفضلة الآن.' }, session, 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });

  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const listingId = typeof body?.listingId === 'string' ? body.listingId.trim() : '';
  const action = body?.action === 'remove' ? 'remove' : body?.action === 'add' ? 'add' : '';
  const staticListingExists = listings.some((listing) => listing.id === listingId && listing.category !== 'emergency');
  const publishedListing = staticListingExists || !listingId ? null : await getPublishedListingById(listingId);
  const listingExists = staticListingExists || Boolean(publishedListing);

  if (!listingId || !action || !listingExists) {
    return respond({ error: 'بيانات المفضلة غير صالحة.' }, session, 400);
  }

  try {
    if (action === 'add') {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/favorites`, {
        method: 'POST',
        headers: {
          ...restHeaders(session.accessToken, true),
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ user_id: session.userId, listing_id: listingId }),
        cache: 'no-store',
      });
      if (!response.ok && response.status !== 409) throw new Error('FAVORITE_ADD_FAILED');
      return respond({ favorite: true }, session);
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${encodeURIComponent(session.userId)}&listing_id=eq.${encodeURIComponent(listingId)}`,
      {
        method: 'DELETE',
        headers: { ...restHeaders(session.accessToken), Prefer: 'return=minimal' },
        cache: 'no-store',
      },
    );
    if (!response.ok) throw new Error('FAVORITE_REMOVE_FAILED');
    return respond({ favorite: false }, session);
  } catch {
    return respond({ error: 'تعذر تحديث المفضلة الآن.' }, session, 500);
  }
}
