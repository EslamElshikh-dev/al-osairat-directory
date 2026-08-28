import { NextResponse } from 'next/server';
import {
  AUTH_ID_COOKIE,
  AUTH_REFRESH_COOKIE,
  authCookieBase,
  authErrorMessage,
  loginWithEmail,
  sameOrigin,
} from '@/lib/auth/firebase-rest';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });

  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    if (!email || !password) return NextResponse.json({ error: 'أدخل البريد وكلمة المرور.' }, { status: 400 });

    const loggedIn = await loginWithEmail(email, password);
    const response = NextResponse.json({
      user: {
        localId: loggedIn.localId,
        email: loggedIn.email,
        displayName: loggedIn.displayName?.trim() || 'عضو دليل العسيرات',
      },
    });
    response.cookies.set(AUTH_ID_COOKIE, loggedIn.idToken, { ...authCookieBase, maxAge: 55 * 60 });
    response.cookies.set(AUTH_REFRESH_COOKIE, loggedIn.refreshToken, { ...authCookieBase, maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch (error) {
    return NextResponse.json({ error: authErrorMessage(error) }, { status: 401 });
  }
}
