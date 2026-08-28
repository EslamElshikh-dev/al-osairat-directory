import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE, authCookieBase, remoteSignOut, sameOrigin } from '@/lib/auth/supabase-rest';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const store = await cookies();
  const accessToken = store.get(AUTH_ACCESS_COOKIE)?.value;
  if (accessToken) await remoteSignOut(accessToken).catch(() => null);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_ACCESS_COOKIE, '', { ...authCookieBase, maxAge: 0 });
  response.cookies.set(AUTH_REFRESH_COOKIE, '', { ...authCookieBase, maxAge: 0 });
  return response;
}
