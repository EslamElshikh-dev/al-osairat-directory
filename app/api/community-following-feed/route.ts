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
} from '@/lib/auth/supabase-rest';
import { getPublicCommunityActivityForUserIds } from '@/lib/community-activity';

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

function restHeaders(accessToken: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: 'Bearer ' + accessToken,
    Accept: 'application/json',
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
    return NextResponse.json({ authenticated: false, items: [], followingCount: 0 }, { status: 401 });
  }

  const requestedLimit = Number(new URL(request.url).searchParams.get('limit') || 30);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(50, Math.max(1, Math.floor(requestedLimit)))
    : 30;

  try {
    const query = new URLSearchParams({
      select: 'followed_user_id',
      follower_id: 'eq.' + session.userId,
      order: 'created_at.desc',
      limit: '100',
    });
    const response = await fetch(
      SUPABASE_URL + '/rest/v1/community_member_follows?' + query.toString(),
      { headers: restHeaders(session.accessToken), cache: 'no-store' },
    );
    if (!response.ok) throw new Error('FOLLOWING_READ_FAILED');

    const rows = await response.json() as FollowRow[];
    const followedUserIds = [...new Set(rows.map((row) => row.followed_user_id).filter(Boolean))];
    const items = followedUserIds.length
      ? await getPublicCommunityActivityForUserIds(followedUserIds, limit)
      : [];

    return respond({
      authenticated: true,
      followingCount: followedUserIds.length,
      items,
    }, session);
  } catch {
    return respond({ error: 'تعذر تحميل نشاط الأعضاء الذين تتابعهم الآن.' }, session, 500);
  }
}
