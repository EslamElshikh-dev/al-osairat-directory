import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { categoryById, listings } from '@/lib/data';
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

type ClaimStatus = 'pending' | 'needs_changes' | 'approved' | 'rejected';
type Relationship = 'owner' | 'manager' | 'authorized_representative';
type ProofMethod = 'listing_phone' | 'google_business_profile' | 'official_document' | 'other';

type ClaimRow = {
  id: string;
  listing_id: string;
  relationship: Relationship;
  phone: string;
  proof_method: ProofMethod;
  proof_details: string;
  status: ClaimStatus;
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

const claimableListings = listings.filter((listing) => !['emergency', 'government'].includes(listing.category));
const listingIndex = new Map(claimableListings.map((listing) => [listing.id, listing]));
const relationshipValues = new Set<string>(['owner', 'manager', 'authorized_representative']);
const proofValues = new Set<string>(['listing_phone', 'google_business_profile', 'official_document', 'other']);

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
      // Try the refresh token below.
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
  return cleanText(value, 32).replace(/[\s()\-]/g, '');
}

function serializeClaim(row: ClaimRow) {
  const listing = listingIndex.get(row.listing_id);
  return {
    id: row.id,
    listingId: row.listing_id,
    listing: listing ? {
      slug: listing.slug,
      title: listing.title,
      categoryLabel: categoryById[listing.category].shortLabel,
      village: listing.village,
      location: listing.location,
    } : null,
    relationship: row.relationship,
    phone: row.phone,
    proofMethod: row.proof_method,
    proofDetails: row.proof_details,
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
      `${SUPABASE_URL}/rest/v1/business_ownership_claims?select=id,listing_id,relationship,phone,proof_method,proof_details,status,review_note,created_at,updated_at,reviewed_at&order=created_at.desc`,
      { headers: restHeaders(session.accessToken), cache: 'no-store' },
    );
    if (!response.ok) throw new Error('CLAIMS_READ_FAILED');
    const rows = await response.json() as ClaimRow[];

    return respond({
      claims: rows.map(serializeClaim),
      listings: claimableListings.map((listing) => ({
        id: listing.id,
        slug: listing.slug,
        title: listing.title,
        categoryLabel: categoryById[listing.category].shortLabel,
        village: listing.village,
        location: listing.location,
        hasPhone: Boolean(listing.phone),
      })),
    }, session);
  } catch {
    return respond({ error: 'تعذر تحميل مطالبات الملكية الآن.' }, session, 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });

  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });
  if (!session.emailVerified) return respond({ error: 'أكد بريدك الإلكتروني قبل إرسال مطالبة ملكية.' }, session, 403);

  const body = await request.json().catch(() => ({}));
  const listingId = cleanText(body?.listingId, 160);
  const relationship = cleanText(body?.relationship, 40);
  const phone = normalizePhone(body?.phone);
  const proofMethod = cleanText(body?.proofMethod, 40);
  const proofDetails = cleanMultiline(body?.proofDetails, 1000);
  const listing = listingIndex.get(listingId);

  if (!listing) return respond({ error: 'اختر نشاطًا منشورًا من الدليل.' }, session, 400);
  if (!relationshipValues.has(relationship)) return respond({ error: 'حدد صفتك بالنسبة للنشاط.' }, session, 400);
  if (!/^\+?\d{7,15}$/.test(phone)) return respond({ error: 'اكتب رقم تواصل صحيحًا.' }, session, 400);
  if (!proofValues.has(proofMethod)) return respond({ error: 'اختر طريقة إثبات الملكية.' }, session, 400);
  if (proofMethod === 'listing_phone' && !listing.phone) {
    return respond({ error: 'هذا النشاط لا يحتوي رقم هاتف منشورًا. اختر طريقة إثبات أخرى.' }, session, 400);
  }
  if (proofDetails.length < 8) return respond({ error: 'أضف تفاصيل كافية تساعد في مراجعة الملكية.' }, session, 400);

  try {
    const openResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/business_ownership_claims?select=id,listing_id&status=in.(pending,needs_changes)&limit=6`,
      { headers: restHeaders(session.accessToken), cache: 'no-store' },
    );
    if (!openResponse.ok) throw new Error('CLAIMS_COUNT_FAILED');
    const openClaims = await openResponse.json() as Array<{ id: string; listing_id: string }>;
    if (openClaims.some((claim) => claim.listing_id === listingId)) {
      return respond({ error: 'لديك مطالبة مفتوحة بالفعل على هذا النشاط.' }, session, 409);
    }
    if (openClaims.length >= 5) {
      return respond({ error: 'لديك 5 مطالبات مفتوحة بالفعل. انتظر مراجعتها قبل إرسال مطالبة جديدة.' }, session, 429);
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/business_ownership_claims`, {
      method: 'POST',
      headers: {
        ...restHeaders(session.accessToken, true),
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        user_id: session.userId,
        listing_id: listingId,
        relationship,
        phone,
        proof_method: proofMethod,
        proof_details: proofDetails,
        status: 'pending',
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 409) return respond({ error: 'لديك مطالبة مفتوحة بالفعل على هذا النشاط.' }, session, 409);
      throw new Error('CLAIM_CREATE_FAILED');
    }

    const rows = await response.json() as ClaimRow[];
    const created = rows[0];
    if (!created) throw new Error('CLAIM_MISSING');
    return respond({ saved: true, claim: serializeClaim(created) }, session, 201);
  } catch {
    return respond({ error: 'تعذر إرسال مطالبة الملكية الآن. حاول مرة أخرى.' }, session, 500);
  }
}
