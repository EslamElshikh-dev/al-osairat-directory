import { NextResponse } from 'next/server';
import { AUTH_ID_COOKIE, AUTH_REFRESH_COOKIE, authCookieBase, sameOrigin } from '@/lib/auth/firebase-rest';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_ID_COOKIE, '', { ...authCookieBase, maxAge: 0 });
  response.cookies.set(AUTH_REFRESH_COOKIE, '', { ...authCookieBase, maxAge: 0 });
  return response;
}
