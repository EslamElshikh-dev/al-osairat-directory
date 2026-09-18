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

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedReasons = new Set(['spam', 'abuse', 'privacy', 'misleading', 'off_topic', 'other']);

type TargetType = 'review' | 'reply';

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

function cleanDetails(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').slice(0, 800);
}

function parseInput(body: Record<string, unknown>) {
  const targetType: TargetType | null =
    body.targetType === 'review' || body.targetType === 'reply' ? body.targetType : null;
  const targetId = typeof body.targetId === 'string' ? body.targetId.trim() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const details = cleanDetails(body.details);

  if (!targetType || !UUID_PATTERN.test(targetId) || !allowedReasons.has(reason)) return null;
  if (reason === 'other' && details.length < 3) return null;
  if (details && details.length < 3) return null;

  return { targetType, targetId, reason, details };
}

async function tooManyRecentReports(session: ResolvedSession) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const query = new URLSearchParams({
    select: 'id',
    user_id: 'eq.' + session.userId,
    created_at: 'gte.' + since,
    limit: '11',
  });
  const response = await fetch(
    SUPABASE_URL + '/rest/v1/community_content_reports?' + query.toString(),
    { headers: memberHeaders(session.accessToken), cache: 'no-store' },
  );
  if (!response.ok) throw new Error('REPORT_RATE_READ_FAILED');
  const rows = await response.json() as Array<{ id: string }>;
  return rows.length >= 10;
}

async function hasOpenReport(
  session: ResolvedSession,
  targetType: TargetType,
  targetId: string,
) {
  const targetColumn = targetType === 'review' ? 'review_id' : 'reply_id';
  const query = new URLSearchParams({
    select: 'id',
    user_id: 'eq.' + session.userId,
    [targetColumn]: 'eq.' + targetId,
    status: 'in.(pending,reviewing)',
    limit: '1',
  });
  const response = await fetch(
    SUPABASE_URL + '/rest/v1/community_content_reports?' + query.toString(),
    { headers: memberHeaders(session.accessToken), cache: 'no-store' },
  );
  if (!response.ok) throw new Error('OPEN_REPORT_READ_FAILED');
  const rows = await response.json() as Array<{ id: string }>;
  return rows.length > 0;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });

  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });
  if (!session.emailVerified) {
    return respond({ error: 'أكد بريدك الإلكتروني أولًا قبل إرسال بلاغ.' }, session, 403);
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const input = parseInput(body);
  if (!input) {
    return respond({ error: 'اختر سببًا صحيحًا واكتب تفاصيل واضحة عند الحاجة.' }, session, 400);
  }

  try {
    if (await tooManyRecentReports(session)) {
      return respond({ error: 'وصلت إلى الحد اليومي للبلاغات. راجع بلاغاتك المفتوحة قبل إرسال المزيد.' }, session, 429);
    }
    if (await hasOpenReport(session, input.targetType, input.targetId)) {
      return respond({ error: 'لديك بلاغ مفتوح بالفعل على هذه المساهمة.' }, session, 409);
    }

    const targetColumn = input.targetType === 'review' ? 'review_id' : 'reply_id';
    const response = await fetch(SUPABASE_URL + '/rest/v1/community_content_reports', {
      method: 'POST',
      headers: {
        ...memberHeaders(session.accessToken, true),
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        user_id: session.userId,
        [targetColumn]: input.targetId,
        reason: input.reason,
        details: input.details || null,
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      if (response.status === 409 || /duplicate key/i.test(detail)) {
        return respond({ error: 'لديك بلاغ مفتوح بالفعل على هذه المساهمة.' }, session, 409);
      }
      if (response.status === 401 || response.status === 403) {
        return respond({ error: 'لا يمكن الإبلاغ عن مساهمتك أنت أو عن محتوى غير منشور.' }, session, 403);
      }
      throw new Error('REPORT_INSERT_FAILED');
    }

    const rows = await response.json() as Array<{ id: string; created_at: string }>;
    return respond({
      saved: true,
      id: rows[0]?.id || null,
      createdAt: rows[0]?.created_at || new Date().toISOString(),
    }, session);
  } catch {
    return respond({ error: 'تعذر إرسال البلاغ الآن. حاول مرة أخرى.' }, session, 500);
  }
}
