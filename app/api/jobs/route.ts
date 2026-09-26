import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { jobAreas, isOsairatJobArea } from '@/lib/jobs-geography';
import { getLocalJobs } from '@/lib/jobs';
import {
  AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL,
  authCookieBase, getUser, mapMember, refreshSession, sameOrigin,
} from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const villageNames = new Set(jobAreas);
const workTypes = new Set(['full-time', 'part-time', 'temporary', 'flexible']);
const contactKinds = new Set(['phone', 'whatsapp', 'email', 'link']);

function clean(value: unknown, length: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, length) : '';
}

export async function GET() {
  const { jobs, available } = await getLocalJobs();
  return NextResponse.json({
    items: [...jobs].sort((a, b) => Number(isOsairatJobArea(b.village)) - Number(isOsairatJobArea(a.village))).slice(0, 6).map((job) => ({
      tag: job.kind === 'offer' ? 'فرصة عمل' : 'باحث عن عمل',
      text: `${job.title} · ${job.village}`,
      href: `/jobs#job-${job.id}`,
    })),
    available,
  }, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240' } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'البيانات غير صالحة.' }, { status: 400 });

  const kind = clean(body.kind, 12);
  const title = clean(body.title, 160);
  const organization = clean(body.organization, 120);
  const village = clean(body.village, 100);
  const field = clean(body.field, 80);
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : '';
  const experience = clean(body.experience, 300);
  const workType = clean(body.workType, 30);
  const contactKind = clean(body.contactKind, 20);
  const contactValue = clean(body.contactValue, 500);

  if (!['offer', 'seeker'].includes(kind) || title.length < 5 || !villageNames.has(village)
    || field.length < 2 || description.length < 20 || !contactKinds.has(contactKind)
    || (workType && !workTypes.has(workType)) || body.consent !== true) {
    return NextResponse.json({ error: 'راجع البيانات، واختار منطقة العمل في سوهاج ووافق على نشر وسيلة التواصل.' }, { status: 400 });
  }
  if ((contactKind === 'phone' || contactKind === 'whatsapp') && !/^\+?[0-9\s-]{9,20}$/.test(contactValue)) {
    return NextResponse.json({ error: 'رقم التواصل غير صحيح.' }, { status: 400 });
  }
  if (contactKind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue)) {
    return NextResponse.json({ error: 'البريد الإلكتروني غير صحيح.' }, { status: 400 });
  }
  if (contactKind === 'link' && !/^https:\/\//i.test(contactValue)) {
    return NextResponse.json({ error: 'رابط التقديم لازم يبدأ بـ https.' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(AUTH_REFRESH_COOKIE)?.value;
  let token = accessToken || '';
  let user = token ? await getUser(token).catch(() => null) : null;
  let rotated: Awaited<ReturnType<typeof refreshSession>> | null = null;
  if (!user && refreshToken) {
    rotated = await refreshSession(refreshToken).catch(() => null);
    if (rotated) { token = rotated.access_token; user = rotated.user; }
  }
  if (!user) return NextResponse.json({ error: 'سجّل دخولك الأول عشان تنشر.' }, { status: 401 });
  const member = mapMember(user);
  if (!member.emailVerified) return NextResponse.json({ error: 'فعّل بريدك الإلكتروني قبل نشر الإعلان.' }, { status: 403 });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/osairat_jobs`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      user_id: member.localId, kind, origin: 'community', title,
      organization: kind === 'offer' ? organization || null : null,
      village, field, description, experience: experience || null,
      work_type: workType || null, contact_kind: contactKind, contact_value: contactValue,
      status: 'pending',
    }), cache: 'no-store',
  }).catch(() => null);
  if (!response?.ok) return NextResponse.json({ error: 'تعذر إرسال الإعلان الآن. حاول مرة ثانية.' }, { status: 502 });

  const result = NextResponse.json({ ok: true, message: 'وصل إعلانك، وهيظهر بعد مراجعته.' }, { status: 201 });
  if (rotated) {
    result.cookies.set(AUTH_ACCESS_COOKIE, rotated.access_token, { ...authCookieBase, maxAge: Math.max(300, (rotated.expires_in || 3600) - 60) });
    result.cookies.set(AUTH_REFRESH_COOKIE, rotated.refresh_token, { ...authCookieBase, maxAge: 60 * 60 * 24 * 30 });
  }
  return result;
}
