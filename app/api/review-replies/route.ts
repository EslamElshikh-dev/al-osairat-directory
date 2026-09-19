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
import { emptyReactionSummary, readCommunityReactionSummaries, type CommunityReactionSummary } from '@/lib/community-reactions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REPLY_MIN_LENGTH = 2;
const REPLY_MAX_LENGTH = 600;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ReplyRow = {
  id: string;
  review_id: string;
  user_id: string;
  body: string;
  author_name: string;
  avatar_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type WatchStateRow = {
  id: string;
  last_seen_at: string | null;
  last_seen_reply_id: string | null;
};

type ResolvedSession = {
  accessToken: string;
  userId: string;
  displayName: string;
  avatarUrl: string;
  emailVerified: boolean;
  refreshed?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};

function publicHeaders(json = false) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

function memberHeaders(accessToken: string, json = false) {
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
      return {
        accessToken,
        userId: user.localId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
      };
    } catch {
      // Fall through to refresh-token recovery.
    }
  }

  if (!refreshToken) return null;

  try {
    const session = await refreshSession(refreshToken);
    const user = mapMember(session.user);
    return {
      accessToken: session.access_token,
      userId: user.localId,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
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

async function readReplies(reviewId: string, session: ResolvedSession | null) {
  const query = new URLSearchParams({
    select: 'id,review_id,user_id,body,author_name,avatar_url,status,created_at,updated_at',
    review_id: `eq.${reviewId}`,
    status: 'eq.published',
    order: 'created_at.asc',
    limit: '100',
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/content_review_replies?${query}`, {
    headers: session ? memberHeaders(session.accessToken) : publicHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('REPLIES_READ_FAILED');
  return response.json() as Promise<ReplyRow[]>;
}

async function readPublicProfileSlugs(userIds: string[]) {
  const ids = [...new Set(userIds.filter((id) => UUID_PATTERN.test(id)))];
  if (!ids.length) return new Map<string, string>();
  const query = new URLSearchParams({
    select: 'user_id,slug',
    user_id: `in.(${ids.join(',')})`,
    is_public: 'eq.true',
    limit: String(Math.min(100, ids.length)),
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/member_public_profiles?${query}`, {
    headers: publicHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) return new Map<string, string>();
  const rows = await response.json() as Array<{ user_id: string; slug: string }>;
  return new Map(rows.map((row) => [row.user_id, row.slug]));
}

async function readOwnReply(session: ResolvedSession, reviewId: string) {
  const query = new URLSearchParams({
    select: 'id,review_id,user_id,body,author_name,avatar_url,status,created_at,updated_at',
    review_id: `eq.${reviewId}`,
    user_id: `eq.${session.userId}`,
    limit: '1',
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/content_review_replies?${query}`, {
    headers: memberHeaders(session.accessToken),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('OWN_REPLY_READ_FAILED');
  const rows = await response.json() as ReplyRow[];
  return rows[0] || null;
}

async function readWatchState(session: ResolvedSession, reviewId: string) {
  const query = new URLSearchParams({
    select: 'id,last_seen_at,last_seen_reply_id',
    user_id: `eq.${session.userId}`,
    review_id: `eq.${reviewId}`,
    limit: '1',
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/community_thread_watches?${query}`, {
    headers: memberHeaders(session.accessToken),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('WATCH_STATE_READ_FAILED');
  const rows = await response.json() as WatchStateRow[];
  return rows[0] || null;
}

function mapReply(row: ReplyRow, session: ResolvedSession | null, slug = '', reactions: CommunityReactionSummary = emptyReactionSummary()) {
  return {
    id: row.id,
    body: row.body,
    authorName: row.author_name,
    avatarUrl: row.avatar_url || '',
    profileSlug: slug,
    reactions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    own: row.user_id === session?.userId,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reviewId = url.searchParams.get('reviewId')?.trim() || '';
  if (!UUID_PATTERN.test(reviewId)) {
    return NextResponse.json({ error: 'التقييم المطلوب غير صالح.' }, { status: 400 });
  }

  const session = await resolveSession();

  try {
    const replies = await readReplies(reviewId, session);
    const [slugs, reactionSummaries, watchState] = await Promise.all([
      readPublicProfileSlugs(replies.map((reply) => reply.user_id)),
      readCommunityReactionSummaries('reply', replies.map((reply) => reply.id), session?.accessToken),
      session ? readWatchState(session, reviewId) : Promise.resolve(null),
    ]);
    return respond({
      authenticated: Boolean(session),
      emailVerified: Boolean(session?.emailVerified),
      watching: Boolean(watchState),
      lastSeenAt: watchState?.last_seen_at || null,
      lastSeenReplyId: watchState?.last_seen_reply_id || null,
      count: replies.length,
      replies: replies.map((reply) => mapReply(
        reply,
        session,
        slugs.get(reply.user_id) || '',
        reactionSummaries.get(reply.id) || emptyReactionSummary(),
      )),
      myReply: session
        ? (() => {
          const row = replies.find((reply) => reply.user_id === session.userId);
          return row ? mapReply(
            row,
            session,
            slugs.get(row.user_id) || '',
            reactionSummaries.get(row.id) || emptyReactionSummary(),
          ) : null;
        })()
        : null,
    }, session);
  } catch {
    return respond({ error: 'تعذر تحميل الردود الآن.' }, session, 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });

  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });
  if (!session.emailVerified) return respond({ error: 'أكد بريدك الإلكتروني أولًا قبل نشر الرد.' }, session, 403);

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const reviewId = typeof body.reviewId === 'string' ? body.reviewId.trim() : '';
  const replyText = typeof body.reply === 'string' ? body.reply.trim() : '';

  if (!UUID_PATTERN.test(reviewId)) {
    return respond({ error: 'التقييم المطلوب غير صالح.' }, session, 400);
  }
  if (replyText.length < REPLY_MIN_LENGTH || replyText.length > REPLY_MAX_LENGTH) {
    return respond({ error: `اكتب ردك في ${REPLY_MIN_LENGTH} إلى ${REPLY_MAX_LENGTH} حرفًا.` }, session, 400);
  }

  try {
    const ownReply = await readOwnReply(session, reviewId);
    const safeAvatarUrl = /^https:\/\//i.test(session.avatarUrl) ? session.avatarUrl.slice(0, 500) : null;
    const payload = {
      body: replyText,
      author_name: session.displayName.slice(0, 100),
      avatar_url: safeAvatarUrl,
      status: 'published',
    };

    let response: Response;
    if (ownReply) {
      const query = new URLSearchParams({
        id: `eq.${ownReply.id}`,
        user_id: `eq.${session.userId}`,
      });
      response = await fetch(`${SUPABASE_URL}/rest/v1/content_review_replies?${query}`, {
        method: 'PATCH',
        headers: {
          ...memberHeaders(session.accessToken, true),
          Prefer: 'return=representation',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });
    } else {
      response = await fetch(`${SUPABASE_URL}/rest/v1/content_review_replies`, {
        method: 'POST',
        headers: {
          ...memberHeaders(session.accessToken, true),
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          review_id: reviewId,
          user_id: session.userId,
          ...payload,
        }),
        cache: 'no-store',
      });
    }

    if (!response.ok) throw new Error('REPLY_WRITE_FAILED');
    const rows = await response.json() as ReplyRow[];
    const slugs = await readPublicProfileSlugs([session.userId]);
    return respond({
      reply: rows[0] ? mapReply(rows[0], session, slugs.get(session.userId) || '') : null,
      updated: Boolean(ownReply),
    }, session);
  } catch {
    return respond({ error: 'تعذر حفظ ردك الآن. حاول مرة أخرى.' }, session, 500);
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });

  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });

  const url = new URL(request.url);
  const reviewId = url.searchParams.get('reviewId')?.trim() || '';
  if (!UUID_PATTERN.test(reviewId)) {
    return respond({ error: 'التقييم المطلوب غير صالح.' }, session, 400);
  }

  try {
    const query = new URLSearchParams({
      review_id: `eq.${reviewId}`,
      user_id: `eq.${session.userId}`,
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/content_review_replies?${query}`, {
      method: 'DELETE',
      headers: { ...memberHeaders(session.accessToken), Prefer: 'return=minimal' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('REPLY_DELETE_FAILED');
    return respond({ deleted: true }, session);
  } catch {
    return respond({ error: 'تعذر حذف ردك الآن.' }, session, 500);
  }
}
