import { NextResponse } from 'next/server';
import { authErrorMessage, recoverPassword, sameOrigin } from '@/lib/auth/supabase-rest';
import { siteConfig } from '@/lib/site';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'اكتب بريدًا إلكترونيًا صحيحًا.' }, { status: 400 });
    }
    await recoverPassword(email, `${siteConfig.url}/account/reset-password`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Avoid account enumeration while still handling malformed requests above.
    const message = authErrorMessage(error);
    if (message.includes('محاولات كثيرة')) return NextResponse.json({ error: message }, { status: 429 });
    return NextResponse.json({ ok: true });
  }
}
