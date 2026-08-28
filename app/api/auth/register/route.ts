import { NextResponse } from 'next/server';
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE, authCookieBase, authErrorMessage, mapMember, sameOrigin, signUp } from '@/lib/auth/supabase-rest';
import { siteConfig } from '@/lib/site';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  try {
    const body = await request.json();
    const name = String(body?.name || '').trim().replace(/\s+/g, ' ');
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    if (name.length < 2 || name.length > 80) return NextResponse.json({ error: 'اكتب اسمًا صحيحًا من حرفين على الأقل.' }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'اكتب بريدًا إلكترونيًا صحيحًا.' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: 'كلمة المرور يجب ألا تقل عن 8 أحرف.' }, { status: 400 });

    const created = await signUp(email, password, name, `${siteConfig.url}/account/login?confirmed=1`);
    const response = NextResponse.json({
      user: mapMember(created.user),
      verificationSent: !created.access_token,
    });
    if (created.access_token && created.refresh_token) {
      response.cookies.set(AUTH_ACCESS_COOKIE, created.access_token, { ...authCookieBase, maxAge: Math.max(300, (created.expires_in || 3600) - 60) });
      response.cookies.set(AUTH_REFRESH_COOKIE, created.refresh_token, { ...authCookieBase, maxAge: 60 * 60 * 24 * 30 });
    }
    return response;
  } catch (error) {
    return NextResponse.json({ error: authErrorMessage(error) }, { status: 400 });
  }
}
