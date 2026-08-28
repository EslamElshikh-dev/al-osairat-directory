import { NextResponse } from 'next/server';
import { sameOrigin, sendPasswordReset } from '@/lib/auth/firebase-rest';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'اكتب بريدًا إلكترونيًا صحيحًا.' }, { status: 400 });
    }
    await sendPasswordReset(email).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
