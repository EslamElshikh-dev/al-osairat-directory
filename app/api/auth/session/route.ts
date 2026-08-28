import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE, authCookieBase, getUser, mapMember, refreshSession } from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const store = await cookies();
  const accessToken = store.get(AUTH_ACCESS_COOKIE)?.value;
  const refreshToken = store.get(AUTH_REFRESH_COOKIE)?.value;

  if (accessToken) {
    try {
      const user = await getUser(accessToken);
      return NextResponse.json({ user: mapMember(user) });
    } catch {
      // Try refreshing below.
    }
  }

  if (refreshToken) {
    try {
      const session = await refreshSession(refreshToken);
      const response = NextResponse.json({ user: mapMember(session.user) });
      response.cookies.set(AUTH_ACCESS_COOKIE, session.access_token, { ...authCookieBase, maxAge: Math.max(300, (session.expires_in || 3600) - 60) });
      response.cookies.set(AUTH_REFRESH_COOKIE, session.refresh_token, { ...authCookieBase, maxAge: 60 * 60 * 24 * 30 });
      return response;
    } catch {
      const response = NextResponse.json({ user: null });
      response.cookies.set(AUTH_ACCESS_COOKIE, '', { ...authCookieBase, maxAge: 0 });
      response.cookies.set(AUTH_REFRESH_COOKIE, '', { ...authCookieBase, maxAge: 0 });
      return response;
    }
  }

  return NextResponse.json({ user: null });
}
