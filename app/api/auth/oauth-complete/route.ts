import { NextResponse } from 'next/server';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  authCookieBase,
  getUser,
  mapMember,
  sameOrigin,
} from '@/lib/auth/supabase-rest';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const accessToken = String(body?.accessToken || '');
    const refreshToken = String(body?.refreshToken || '');

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: 'تعذر إكمال تسجيل الدخول بواسطة Google.' }, { status: 400 });
    }

    const user = await getUser(accessToken);
    const response = NextResponse.json({ user: mapMember(user) });
    response.cookies.set(AUTH_ACCESS_COOKIE, accessToken, { ...authCookieBase, maxAge: 55 * 60 });
    response.cookies.set(AUTH_REFRESH_COOKIE, refreshToken, { ...authCookieBase, maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch {
    return NextResponse.json({ error: 'تعذر التحقق من حساب Google. حاول مرة أخرى.' }, { status: 401 });
  }
}
