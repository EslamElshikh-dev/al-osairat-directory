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
import { getPublicMemberFollowerCount } from '@/lib/community-follows';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ResolvedSession = {
  accessToken: string;
  userId: string;
  emailVerified: boolean;
  refreshed?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};

type PublicProfileRow = {
  user_id: string;
  slug: string;
};

type FollowRow = {
  id: string;
};

function publicHeaders() {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: 'Bearer ' + SUPABASE_PUBLISHABLE_KEY,
    Accept: 'application/json',
  };
}

function memberHeaders(accessToken: string, json = false) {
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
      const user = mapMember(await getUser(accessToken));
      return { accessToken, userId: user.localId, emailVerified: user.emailVerified };
    } catch {
      // Continue to refresh-token recovery.
    }
  }

  if (!refreshToken) return null;

  try {
    const session = await refreshSession(refreshToken);
    const user = mapMember(session.user);
    return {
      accessToken: session.access_token,
      userId: user.localId,
      emailVerified: user.emailVerified,
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

function validSlug(slug: string) {
  return /^[a-z0-9][a-z0-9-]{7,48}$/.test(slug);
}

async function readTargetProfile(slug: string) {
  const query = new URLSearchParams({
    select: 'user_id,slug',
    slug: 'eq.' + slug,
    is_public: 'eq.true',
    limit: '1',
  });
  const response = await fetch(
    SUPABASE_URL + '/rest/v1/member_public_profiles?' + query.toString(),
    { headers: publicHeaders(), cache: 'no-store' },
  );
  if (!response.ok) return null;
  const rows = await response.json() as PublicProfileRow[];
  return rows[0] || null;
}

async function readOwnFollow(
  session: ResolvedSession,
  targetUserId: string,
) {
  const query = new URLSearchParams({
    select: 'id',
    follower_id: 'eq.' + session.userId,
    followed_user_id: 'eq.' + targetUserId,
    limit: '1',
  });
  const response = await fetch(
    SUPABASE_URL + '/rest/v1/community_member_follows?' + query.toString(),
    { headers: memberHeaders(session.accessToken), cache: 'no-store' },
  );
  if (!response.ok) throw new Error('FOLLOW_READ_FAILED');
  const rows = await response.json() as FollowRow[];
  return rows[0] || null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug')?.trim() || '';
  if (!validSlug(slug)) return NextResponse.json({ error: 'صفحة العضو غير صحيحة.' }, { status: 400 });

  const target = await readTargetProfile(slug);
  if (!target) return NextResponse.json({ error: 'العضو غير متاح للمتابعة.' }, { status: 404 });

  const session = await resolveSession();
  const followerCount = await getPublicMemberFollowerCount(target.user_id);

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      emailVerified: false,
      own: false,
      following: false,
      followerCount,
    });
  }

  const own = session.userId === target.user_id;
  const follow = own ? null : await readOwnFollow(session, target.user_id).catch(() => null);

  return respond({
    authenticated: true,
    emailVerified: session.emailVerified,
    own,
    following: Boolean(follow),
    followerCount,
  }, session);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });

  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });
  if (!session.emailVerified) {
    return respond({ error: 'أكد بريدك الإلكتروني أولًا قبل متابعة الأعضاء.' }, session, 403);
  }

  const body = await request.json().catch(() => ({})) as { slug?: unknown };
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  if (!validSlug(slug)) return respond({ error: 'صفحة العضو غير صحيحة.' }, session, 400);

  const target = await readTargetProfile(slug);
  if (!target) return respond({ error: 'العضو غير متاح للمتابعة.' }, session, 404);
  if (target.user_id === session.userId) {
    return respond({ error: 'لا يمكنك متابعة صفحتك أنت.' }, session, 400);
  }

  try {
    const existing = await readOwnFollow(session, target.user_id);

    if (existing) {
      const query = new URLSearchParams({
        id: 'eq.' + existing.id,
        follower_id: 'eq.' + session.userId,
      });
      const response = await fetch(
        SUPABASE_URL + '/rest/v1/community_member_follows?' + query.toString(),
        {
          method: 'DELETE',
          headers: { ...memberHeaders(session.accessToken), Prefer: 'return=minimal' },
          cache: 'no-store',
        },
      );
      if (!response.ok) throw new Error('FOLLOW_DELETE_FAILED');
    } else {
      const response = await fetch(SUPABASE_URL + '/rest/v1/community_member_follows', {
        method: 'POST',
        headers: {
          ...memberHeaders(session.accessToken, true),
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          follower_id: session.userId,
          followed_user_id: target.user_id,
        }),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('FOLLOW_INSERT_FAILED');
    }

    const followerCount = await getPublicMemberFollowerCount(target.user_id);
    return respond({
      following: !existing,
      followerCount,
    }, session);
  } catch {
    return respond({ error: 'تعذر تحديث المتابعة الآن. حاول مرة أخرى.' }, session, 500);
  }
}
