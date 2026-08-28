import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { categories, villages } from '@/lib/data';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  authCookieBase,
  getUser,
  mapMember,
  refreshSession,
  sameOrigin,
} from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type SubmissionStatus = 'pending' | 'needs_changes' | 'approved' | 'rejected';

type SubmissionRow = {
  id: string;
  business_name: string;
  category: string;
  sub_category: string | null;
  village: string;
  locality: string | null;
  location_details: string;
  phone: string | null;
  whatsapp: string | null;
  hours: string | null;
  description: string | null;
  google_maps_url: string | null;
  status: SubmissionStatus;
  review_note: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
};

type ResolvedSession = {
  accessToken: string;
  userId: string;
  emailVerified: boolean;
  refreshed?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};

const allowedCategories = categories.filter((category) => !['emergency', 'government'].includes(category.id));
const categoryIds: Set<string> = new Set(allowedCategories.map((category) => category.id));
const categoryLabels: Map<string, string> = new Map(allowedCategories.map((category) => [category.id, category.shortLabel]));
const allowedVillages = villages.filter((village) => village.name !== 'مركز العسيرات');
const villageNames: Set<string> = new Set(allowedVillages.map((village) => village.name));

function restHeaders(accessToken: string, json = false) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function resolveSession(): Promise<ResolvedSession | null> {
  const store = await cookies();
  const accessToken = store.get(AUTH_ACCESS_COOKIE)?.value;
  const refreshToken = store.get(AUTH_REFRESH_COOKIE)?.value;

  if (accessToken) {
    try {
      const member = mapMember(await getUser(accessToken));
      return { accessToken, userId: member.localId, emailVerified: member.emailVerified };
    } catch {
      // Try refresh token below.
    }
  }

  if (!refreshToken) return null;

  try {
    const session = await refreshSession(refreshToken);
    const member = mapMember(session.user);
    return {
      accessToken: session.access_token,
      userId: member.localId,
      emailVerified: member.emailVerified,
      refreshed: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresIn: session.expires_in || 3600,
      },
    };
  } catch {
    return null;
  }
}

function respond(payload: unknown, session: ResolvedSession | null, status = 200) {
  const response = NextResponse.json(payload, { status });
  if (session?.refreshed) {
    response.cookies.set(AUTH_ACCESS_COOKIE, session.refreshed.accessToken, {
      ...authCookieBase,
      maxAge: Math.max(300, session.refreshed.expiresIn - 60),
    });
    response.cookies.set(AUTH_REFRESH_COOKIE, session.refreshed.refreshToken, {
      ...authCookieBase,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function cleanMultiline(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').slice(0, maxLength);
}

function normalizePhone(value: unknown) {
  const raw = cleanText(value, 32);
  if (!raw) return '';
  return raw.replace(/[\s()\-]/g, '');
}

function validPhone(value: string) {
  return !value || /^\+?\d{7,15}$/.test(value);
}

function normalizeMapsUrl(value: unknown) {
  const raw = cleanText(value, 500);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return '';
    const host = url.hostname.toLowerCase();
    const allowed = host === 'maps.app.goo.gl' || host === 'goo.gl' || host === 'google.com' || host.endsWith('.google.com');
    return allowed ? url.toString() : '';
  } catch {
    return '';
  }
}

function serialize(row: SubmissionRow) {
  return {
    id: row.id,
    businessName: row.business_name,
    category: row.category,
    categoryLabel: categoryLabels.get(row.category) || row.category,
    subCategory: row.sub_category || '',
    village: row.village,
    locality: row.locality || '',
    locationDetails: row.location_details,
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    hours: row.hours || '',
    description: row.description || '',
    googleMapsUrl: row.google_maps_url || '',
    status: row.status,
    reviewNote: row.review_note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at,
  };
}

export async function GET() {
  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/business_submissions?select=id,business_name,category,sub_category,village,locality,location_details,phone,whatsapp,hours,description,google_maps_url,status,review_note,created_at,updated_at,reviewed_at&order=created_at.desc`,
      { headers: restHeaders(session.accessToken), cache: 'no-store' },
    );
    if (!response.ok) throw new Error('SUBMISSIONS_READ_FAILED');
    const rows = await response.json() as SubmissionRow[];
    return respond({ submissions: rows.map(serialize) }, session);
  } catch {
    return respond({ error: 'تعذر تحميل طلباتك الآن.' }, session, 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });

  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });
  if (!session.emailVerified) return respond({ error: 'أكد بريدك الإلكتروني قبل إرسال نشاط جديد.' }, session, 403);

  const body = await request.json().catch(() => ({}));
  const businessName = cleanText(body?.businessName, 120);
  const category = cleanText(body?.category, 40);
  const subCategory = cleanText(body?.subCategory, 120);
  const village = cleanText(body?.village, 80);
  const locality = cleanText(body?.locality, 100);
  const locationDetails = cleanText(body?.locationDetails, 240);
  const phone = normalizePhone(body?.phone);
  const whatsapp = normalizePhone(body?.whatsapp);
  const hours = cleanText(body?.hours, 180);
  const description = cleanMultiline(body?.description, 800);
  const rawMapsUrl = cleanText(body?.googleMapsUrl, 500);
  const googleMapsUrl = normalizeMapsUrl(rawMapsUrl);

  if (businessName.length < 2) return respond({ error: 'اكتب اسم النشاط بشكل صحيح.' }, session, 400);
  if (!categoryIds.has(category)) return respond({ error: 'اختر قسمًا صحيحًا للنشاط.' }, session, 400);
  if (!villageNames.has(village)) return respond({ error: 'اختر قرية من قرى مركز العسيرات.' }, session, 400);
  if (locationDetails.length < 3) return respond({ error: 'اكتب وصفًا واضحًا لموقع النشاط داخل القرية.' }, session, 400);
  if (!validPhone(phone) || !validPhone(whatsapp)) return respond({ error: 'راجع رقم الهاتف أو واتساب واستخدم أرقامًا صحيحة.' }, session, 400);
  if (rawMapsUrl && !googleMapsUrl) return respond({ error: 'رابط خرائط Google غير صحيح.' }, session, 400);
  if (!phone && !whatsapp && !googleMapsUrl) return respond({ error: 'أضف وسيلة تواصل واحدة على الأقل: هاتف أو واتساب أو رابط خرائط Google.' }, session, 400);

  try {
    const pendingResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/business_submissions?select=id&status=in.(pending,needs_changes)&limit=6`,
      { headers: restHeaders(session.accessToken), cache: 'no-store' },
    );
    if (!pendingResponse.ok) throw new Error('PENDING_COUNT_FAILED');
    const pendingRows = await pendingResponse.json() as Array<{ id: string }>;
    if (pendingRows.length >= 5) {
      return respond({ error: 'لديك 5 طلبات مفتوحة بالفعل. انتظر مراجعتها قبل إرسال طلب جديد.' }, session, 429);
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/business_submissions`, {
      method: 'POST',
      headers: {
        ...restHeaders(session.accessToken, true),
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        user_id: session.userId,
        business_name: businessName,
        category,
        sub_category: subCategory || null,
        village,
        locality: locality || null,
        location_details: locationDetails,
        phone: phone || null,
        whatsapp: whatsapp || null,
        hours: hours || null,
        description: description || null,
        google_maps_url: googleMapsUrl || null,
        status: 'pending',
      }),
      cache: 'no-store',
    });

    if (!response.ok) throw new Error('SUBMISSION_CREATE_FAILED');
    const rows = await response.json() as SubmissionRow[];
    const created = rows[0];
    if (!created) throw new Error('SUBMISSION_MISSING');
    return respond({ saved: true, submission: serialize(created) }, session, 201);
  } catch {
    return respond({ error: 'تعذر إرسال الطلب الآن. حاول مرة أخرى.' }, session, 500);
  }
}
