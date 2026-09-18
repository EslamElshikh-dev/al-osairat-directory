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
import {
  readCommunityReactionSummary,
  type CommunityReactionTarget,
} from '@/lib/community-reactions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ReactionType = 'like' | 'helpful';

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

type ReactionRow = {
  id: string;
  reaction_type: ReactionType;
};

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
      return {
        accessToken,
        userId: user.localId,
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

function parseBody(body: Record<string, unknown>) {
  const targetType: CommunityReactionTarget | null =
    body.targetType === 'review' || body.targetType === 'reply' ? body.targetType : null;
  const targetId = typeof body.targetId === 'string' ? body.targetId.trim() : '';
  const reaction: ReactionType | null =
    body.reaction === 'like' || body.reaction === 'helpful' ? body.reaction : null;

  if (!targetType || !UUID_PATTERN.test(targetId) || !reaction) return null;
  return { targetType, targetId, reaction };
}

async function readOwnReaction(
  session: ResolvedSession,
  targetType: CommunityReactionTarget,
  targetId: string,
  reaction: ReactionType,
) {
  const targetColumn = targetType === 'review' ? 'review_id' : 'reply_id';
  const query = new URLSearchParams({
    select: 'id,reaction_type',
    user_id: 'eq.' + session.userId,
    [targetColumn]: 'eq.' + targetId,
    reaction_type: 'eq.' + reaction,
    limit: '1',
  });
  const response = await fetch(SUPABASE_URL + '/rest/v1/community_reactions?' + query.toString(), {
    headers: memberHeaders(session.accessToken),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('REACTION_READ_FAILED');
  const rows = await response.json() as ReactionRow[];
  return rows[0] || null;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  }

  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });
  }
  if (!session.emailVerified) {
    return respond({ error: 'أكد بريدك الإلكتروني أولًا قبل التفاعل.' }, session, 403);
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const input = parseBody(body);
  if (!input) return respond({ error: 'بيانات التفاعل غير صحيحة.' }, session, 400);

  try {
    const existing = await readOwnReaction(
      session,
      input.targetType,
      input.targetId,
      input.reaction,
    );
    const targetColumn = input.targetType === 'review' ? 'review_id' : 'reply_id';

    if (existing) {
      const query = new URLSearchParams({
        id: 'eq.' + existing.id,
        user_id: 'eq.' + session.userId,
      });
      const response = await fetch(SUPABASE_URL + '/rest/v1/community_reactions?' + query.toString(), {
        method: 'DELETE',
        headers: { ...memberHeaders(session.accessToken), Prefer: 'return=minimal' },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('REACTION_DELETE_FAILED');
    } else {
      const response = await fetch(SUPABASE_URL + '/rest/v1/community_reactions', {
        method: 'POST',
        headers: {
          ...memberHeaders(session.accessToken, true),
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          user_id: session.userId,
          [targetColumn]: input.targetId,
          reaction_type: input.reaction,
        }),
        cache: 'no-store',
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return respond({ error: 'لا يمكنك التفاعل مع مساهمتك أو مع محتوى غير منشور.' }, session, 403);
        }
        throw new Error('REACTION_INSERT_FAILED');
      }
    }

    const reactions = await readCommunityReactionSummary(
      input.targetType,
      input.targetId,
      session.accessToken,
    );
    return respond({ reactions }, session);
  } catch {
    return respond({ error: 'تعذر حفظ التفاعل الآن. حاول مرة أخرى.' }, session, 500);
  }
}
