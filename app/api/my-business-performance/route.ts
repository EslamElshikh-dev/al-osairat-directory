import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { categoryById, listings, type DirectoryListing } from '@/lib/data';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  authCookieBase,
  getUser,
  mapMember,
  refreshSession,
} from '@/lib/auth/supabase-rest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PerformanceRow = {
  listingId: string;
  views7d: number;
  views30d: number;
  phone30d: number;
  whatsapp30d: number;
  maps30d: number;
  favorites30d: number;
};

type Session = {
  accessToken: string;
  refreshed?: { accessToken: string; refreshToken: string; expiresIn: number };
};

function headers(accessToken: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

async function resolveSession(): Promise<Session | null> {
  const store = await cookies();
  const accessToken = store.get(AUTH_ACCESS_COOKIE)?.value;
  const refreshToken = store.get(AUTH_REFRESH_COOKIE)?.value;
  if (accessToken) {
    try {
      await getUser(accessToken);
      return { accessToken };
    } catch {}
  }
  if (!refreshToken) return null;
  try {
    const next = await refreshSession(refreshToken);
    mapMember(next.user);
    return {
      accessToken: next.access_token,
      refreshed: { accessToken: next.access_token, refreshToken: next.refresh_token, expiresIn: next.expires_in || 3600 },
    };
  } catch {
    return null;
  }
}

function respond(payload: unknown, session: Session | null, status = 200) {
  const response = NextResponse.json(payload, { status });
  if (session?.refreshed) {
    response.cookies.set(AUTH_ACCESS_COOKIE, session.refreshed.accessToken, { ...authCookieBase, maxAge: Math.max(300, session.refreshed.expiresIn - 60) });
    response.cookies.set(AUTH_REFRESH_COOKIE, session.refreshed.refreshToken, { ...authCookieBase, maxAge: 60 * 60 * 24 * 30 });
  }
  return response;
}

async function getLiveListings() {
  const [base, published] = await Promise.all([applyListingOverrides(listings), getPublishedListings()]);
  const index = new Map<string, DirectoryListing>();
  [...base, ...published].forEach((item) => index.set(item.id, item));
  return index;
}

export async function GET() {
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });

  const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_my_listing_performance`, {
    method: 'POST',
    headers: headers(session.accessToken),
    body: '{}',
    cache: 'no-store',
  });
  if (!rpcResponse.ok) return respond({ error: 'تعذر تحميل أداء أنشطتك.' }, session, 500);

  const [rows, listingIndex] = await Promise.all([
    rpcResponse.json() as Promise<PerformanceRow[]>,
    getLiveListings(),
  ]);

  return respond({
    items: (rows || []).map((item) => {
      const listing = listingIndex.get(item.listingId);
      const interactions30d = Number(item.phone30d || 0) + Number(item.whatsapp30d || 0) + Number(item.maps30d || 0) + Number(item.favorites30d || 0);
      const views30d = Number(item.views30d || 0);
      return {
        ...item,
        title: listing?.title || item.listingId,
        slug: listing?.slug || '',
        village: listing?.village || '—',
        category: listing ? categoryById[listing.category].shortLabel : '—',
        interactions30d,
        conversionRate30d: views30d ? interactions30d / views30d : 0,
      };
    }),
  }, session);
}
