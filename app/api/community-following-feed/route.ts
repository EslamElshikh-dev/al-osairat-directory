import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
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
import { getPublicCommunityActivityForUserIds } from '@/lib/community-activity';
import { getSuggestedPublicMembers } from '@/lib/community-profiles';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ResolvedSession = {
  accessToken: string;
  userId: string;
  refreshed?: { accessToken: string; refreshToken: string; expiresIn: number };
};

type FollowRow = {
  followed_user_id: string;
};

type FeedStateRow = {
  last_seen_at: string | null;
};

function restHeaders(accessToken: string, json = false) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: 'Bearer ' + accessToken,
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
      return { accessToken, userId: member.localId };
    } catch {
      // Recover from the refresh token below.
    }
  }
  if (!refreshToken) return null;

  try {
    const session = await refreshSession(refreshToken);
    const member = mapMember(session.user);
    return {
      accessToken: session.access_token,
      userId: member.localId,
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

export async function GET(request: Request) {
  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({
      authenticated: false,
      items: [],
      followingCount: 0,
      newCount: 0,
      lastSeenAt: null,
      suggestions: [],
    }, { status: 401 });
  }

  const requestedLimit = Number(new URL(request.url).searchParams.get('limit') || 30);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(50, Math.max(1, Math.floor(requestedLimit)))
    : 30;

  try {
    const followQuery = new URLSearchParams({
      select: 'followed_user_id',
      follower_id: 'eq.' + session.userId,
      order: 'created_at.desc',
      limit: '100',
    });
    const stateQuery = new URLSearchParams({
      select: 'last_seen_at',
      user_id: 'eq.' + session.userId,
      limit: '1',
    });

    const [followResponse, stateResponse] = await Promise.all([
      fetch(
        SUPABASE_URL + '/rest/v1/community_member_follows?' + followQuery.toString(),
        { headers: restHeaders(session.accessToken), cache: 'no-store' },
      ),
      fetch(
        SUPABASE_URL + '/rest/v1/community_feed_state?' + stateQuery.toString(),
        { headers: restHeaders(session.accessToken), cache: 'no-store' },
      ),
    ]);
    if (!followResponse.ok || !stateResponse.ok) throw new Error('FOLLOWING_READ_FAILED');

    const rows = await followResponse.json() as FollowRow[];
    const states = await stateResponse.json() as FeedStateRow[];
    const followedUserIds = [...new Set(rows.map((row) => row.followed_user_id).filter(Boolean))];
    const lastSeenAt = states[0]?.last_seen_at || null;

    const [items, suggestions] = await Promise.all([
      followedUserIds.length
        ? getPublicCommunityActivityForUserIds(followedUserIds, limit)
        : Promise.resolve([]),
      getSuggestedPublicMembers([session.userId, ...followedUserIds], 4),
    ]);

    const newCount = lastSeenAt
      ? items.filter((item) => Date.parse(item.createdAt) > Date.parse(lastSeenAt)).length
      : items.length;

    return respond({
      authenticated: true,
      followingCount: followedUserIds.length,
      newCount,
      lastSeenAt,
      items,
      suggestions,
    }, session);
  } catch {
    return respond({ error: 'تعذر تحميل نشاط الأعضاء الذين تتابعهم الآن.' }, session, 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  }

  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as { action?: unknown };
  if (body.action !== 'mark_seen') {
    return respond({ error: 'إجراء غير صحيح.' }, session, 400);
  }

  const now = new Date().toISOString();

  try {
    const response = await fetch(
      SUPABASE_URL + '/rest/v1/community_feed_state?on_conflict=user_id',
      {
        method: 'POST',
        headers: {
          ...restHeaders(session.accessToken, true),
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify({
          user_id: session.userId,
          last_seen_at: now,
        }),
        cache: 'no-store',
      },
    );
    if (!response.ok) throw new Error('FOLLOWING_MARK_SEEN_FAILED');

    return respond({ saved: true, lastSeenAt: now, newCount: 0 }, session);
  } catch {
    return respond({ error: 'تعذر تحديث حالة Feed الآن.' }, session, 500);
  }
}
