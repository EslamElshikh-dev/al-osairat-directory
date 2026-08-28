import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  AUTH_ID_COOKIE,
  AUTH_REFRESH_COOKIE,
  authCookieBase,
  lookupUser,
  refreshIdToken,
} from '@/lib/auth/firebase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const store = await cookies();
  const idToken = store.get(AUTH_ID_COOKIE)?.value;
  const refreshToken = store.get(AUTH_REFRESH_COOKIE)?.value;

  if (idToken) {
    try {
      const user = await lookupUser(idToken);
      return NextResponse.json({ user });
    } catch {
      // Try the refresh token below.
    }
  }

  if (refreshToken) {
    try {
      const refreshed = await refreshIdToken(refreshToken);
      const user = await lookupUser(refreshed.idToken);
      const response = NextResponse.json({ user });
      response.cookies.set(AUTH_ID_COOKIE, refreshed.idToken, { ...authCookieBase, maxAge: 55 * 60 });
      response.cookies.set(AUTH_REFRESH_COOKIE, refreshed.refreshToken, { ...authCookieBase, maxAge: 60 * 60 * 24 * 30 });
      return response;
    } catch {
      const response = NextResponse.json({ user: null });
      response.cookies.set(AUTH_ID_COOKIE, '', { ...authCookieBase, maxAge: 0 });
      response.cookies.set(AUTH_REFRESH_COOKIE, '', { ...authCookieBase, maxAge: 0 });
      return response;
    }
  }

  return NextResponse.json({ user: null });
}
