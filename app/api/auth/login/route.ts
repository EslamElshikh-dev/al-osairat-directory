import { NextResponse } from 'next/server';
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE, authCookieBase, authErrorMessage, mapMember, sameOrigin, signIn } from '@/lib/auth/supabase-rest';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    if (!email || !password) return NextResponse.json({ error: 'أدخل البريد وكلمة المرور.' }, { status: 400 });

    const session = await signIn(email, password);
    const response = NextResponse.json({ user: mapMember(session.user) });
    response.cookies.set(AUTH_ACCESS_COOKIE, session.access_token, { ...authCookieBase, maxAge: Math.max(300, (session.expires_in || 3600) - 60) });
    response.cookies.set(AUTH_REFRESH_COOKIE, session.refresh_token, { ...authCookieBase, maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch (error) {
    return NextResponse.json({ error: authErrorMessage(error) }, { status: 401 });
  }
}
