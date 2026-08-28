import { NextResponse } from 'next/server';
import { authErrorMessage, sameOrigin, updatePassword } from '@/lib/auth/supabase-rest';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  try {
    const body = await request.json();
    const accessToken = String(body?.accessToken || '');
    const password = String(body?.password || '');
    if (!accessToken) return NextResponse.json({ error: 'رابط الاستعادة غير صالح أو انتهت صلاحيته.' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: 'كلمة المرور يجب ألا تقل عن 8 أحرف.' }, { status: 400 });
    await updatePassword(accessToken, password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: authErrorMessage(error) }, { status: 400 });
  }
}
