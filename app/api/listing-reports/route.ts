import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { listings, type DirectoryListing } from '@/lib/data';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
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

type ReportType = 'wrong_info' | 'closed' | 'duplicate' | 'phone' | 'location' | 'hours' | 'other';

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

const reportTypes = new Set<string>(['wrong_info', 'closed', 'duplicate', 'phone', 'location', 'hours', 'other']);
const staticReportableListings = listings.filter((listing) => listing.category !== 'emergency');

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

async function getReportableListings() {
  const [published, staticListings] = await Promise.all([
    getPublishedListings(),
    applyListingOverrides(staticReportableListings),
  ]);
  const index = new Map<string, DirectoryListing>();
  [...staticListings, ...published].forEach((listing) => {
    if (listing.category !== 'emergency') index.set(listing.id, listing);
  });
  return index;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });

  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا لإرسال البلاغ.' }, { status: 401 });
  if (!session.emailVerified) return respond({ error: 'أكد بريدك الإلكتروني قبل إرسال بلاغ بيانات.' }, session, 403);

  const body = await request.json().catch(() => ({}));
  const listingId = cleanText(body?.listingId, 160);
  const reportType = cleanText(body?.reportType, 40) as ReportType;
  const details = cleanMultiline(body?.details, 1200);

  if (!reportTypes.has(reportType)) return respond({ error: 'اختر نوع المشكلة من القائمة.' }, session, 400);
  if (details.length < 8) return respond({ error: 'اكتب تفاصيل أوضح عن المعلومة التي تحتاج مراجعة.' }, session, 400);

  const listingIndex = await getReportableListings();
  if (!listingIndex.has(listingId)) return respond({ error: 'تعذر العثور على هذا النشاط ضمن السجلات المنشورة.' }, session, 404);

  try {
    const openResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/listing_reports?select=id,listing_id,status&status=in.(pending,reviewing)&limit=11`,
      { headers: restHeaders(session.accessToken), cache: 'no-store' },
    );
    if (!openResponse.ok) throw new Error('REPORTS_READ_FAILED');
    const openReports = await openResponse.json() as Array<{ id: string; listing_id: string; status: string }>;

    if (openReports.some((report) => report.listing_id === listingId)) {
      return respond({ error: 'لديك بلاغ مفتوح بالفعل على هذا النشاط وسيتم مراجعته.' }, session, 409);
    }
    if (openReports.length >= 10) {
      return respond({ error: 'لديك عدة بلاغات مفتوحة حاليًا. انتظر مراجعتها قبل إرسال بلاغ جديد.' }, session, 429);
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/listing_reports`, {
      method: 'POST',
      headers: {
        ...restHeaders(session.accessToken, true),
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: session.userId,
        listing_id: listingId,
        report_type: reportType,
        details,
        status: 'pending',
      }),
      cache: 'no-store',
    });

    if (!response.ok) throw new Error('REPORT_CREATE_FAILED');
    return respond({ saved: true }, session, 201);
  } catch {
    return respond({ error: 'تعذر إرسال البلاغ الآن. حاول مرة أخرى بعد قليل.' }, session, 500);
  }
}
