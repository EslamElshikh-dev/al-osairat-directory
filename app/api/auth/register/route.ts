import { NextResponse } from 'next/server';
import {
  AUTH_ID_COOKIE,
  AUTH_REFRESH_COOKIE,
  authCookieBase,
  authErrorMessage,
  registerWithEmail,
  sameOrigin,
  sendVerificationEmail,
  updateDisplayName,
} from '@/lib/auth/firebase-rest';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });

  try {
    const body = await request.json();
    const name = String(body?.name || '').trim().replace(/\s+/g, ' ');
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: 'اكتب اسمًا صحيحًا من حرفين على الأقل.' }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'اكتب بريدًا إلكترونيًا صحيحًا.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'كلمة المرور يجب ألا تقل عن 8 أحرف.' }, { status: 400 });
    }

    const created = await registerWithEmail(email, password);
    const updated = await updateDisplayName(created.idToken, name);
    const idToken = updated.idToken || created.idToken;
    const refreshToken = updated.refreshToken || created.refreshToken;

    await sendVerificationEmail(idToken).catch(() => null);

    const response = NextResponse.json({
      user: { localId: created.localId, email, displayName: name, emailVerified: false },
      verificationSent: true,
    });
    response.cookies.set(AUTH_ID_COOKIE, idToken, { ...authCookieBase, maxAge: 55 * 60 });
    response.cookies.set(AUTH_REFRESH_COOKIE, refreshToken, { ...authCookieBase, maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch (error) {
    return NextResponse.json({ error: authErrorMessage(error) }, { status: 400 });
  }
}
