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

type ResolvedSession = {
  accessToken: string;
  userId: string;
  refreshed?: { accessToken: string; refreshToken: string; expiresIn: number };
};

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string;
  entity_type: string;
  entity_id: string;
  read_at: string | null;
  created_at: string;
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
      const member = mapMember(await getUser(accessToken));
      return { accessToken, userId: member.localId };
    } catch {}
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

function serialize(row: NotificationRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    href: row.href,
    entityType: row.entity_type,
    entityId: row.entity_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function GET(request: Request) {
  const session = await resolveSession();
  if (!session) return NextResponse.json({ authenticated: false, notifications: [], unreadCount: 0 }, { status: 401 });

  const requestedLimit = Number(new URL(request.url).searchParams.get('limit') || 30);
  const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, Math.floor(requestedLimit))) : 30;

  try {
    const [itemsResponse, unreadResponse] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/member_notifications?select=id,type,title,message,href,entity_type,entity_id,read_at,created_at&order=created_at.desc&limit=${limit}`, {
        headers: restHeaders(session.accessToken), cache: 'no-store',
      }),
      fetch(`${SUPABASE_URL}/rest/v1/member_notifications?select=id&read_at=is.null`, {
        headers: restHeaders(session.accessToken), cache: 'no-store',
      }),
    ]);
    if (!itemsResponse.ok || !unreadResponse.ok) throw new Error('NOTIFICATIONS_READ_FAILED');

    const rows = await itemsResponse.json() as NotificationRow[];
    const unread = await unreadResponse.json() as Array<{ id: string }>;
    return respond({ authenticated: true, notifications: rows.map(serialize), unreadCount: unread.length }, session);
  } catch {
    return respond({ error: 'تعذر تحميل الإشعارات الآن.' }, session, 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = body?.action === 'read_all' ? 'read_all' : body?.action === 'read' ? 'read' : '';
  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  if (!action || (action === 'read' && !id)) return respond({ error: 'بيانات الإشعار غير صحيحة.' }, session, 400);

  const now = new Date().toISOString();
  const filter = action === 'read_all'
    ? 'read_at=is.null'
    : `id=eq.${encodeURIComponent(id)}&read_at=is.null`;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/member_notifications?${filter}`, {
      method: 'PATCH',
      headers: { ...restHeaders(session.accessToken, true), Prefer: 'return=minimal' },
      body: JSON.stringify({ read_at: now }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('NOTIFICATION_UPDATE_FAILED');
    return respond({ saved: true, action, id: id || null, readAt: now }, session);
  } catch {
    return respond({ error: 'تعذر تحديث حالة الإشعار الآن.' }, session, 500);
  }
}
