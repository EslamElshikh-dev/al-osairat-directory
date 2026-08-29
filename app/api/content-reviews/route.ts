import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { blogBySlug } from '@/lib/blog-published';
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

const PAGE_SIZE = 6;
const REVIEW_MIN_LENGTH = 20;
const REVIEW_MAX_LENGTH = 1200;

type ReviewTargetType = 'site' | 'article';

type ReviewRow = {
  id: string;
  user_id?: string;
  rating: number;
  body: string;
  author_name: string;
  avatar_url: string | null;
  status?: string;
  created_at: string;
  updated_at: string;
};

type SummaryRow = {
  review_count: number | string;
  average_rating: number | string;
  star_5: number | string;
  star_4: number | string;
  star_3: number | string;
  star_2: number | string;
  star_1: number | string;
};

type ResolvedSession = {
  accessToken: string;
  userId: string;
  displayName: string;
  avatarUrl: string;
  emailVerified: boolean;
  refreshed?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};

function publicHeaders(json = false) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

function memberHeaders(accessToken: string, json = false) {
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
      const user = mapMember(await getUser(accessToken));
      return {
        accessToken,
        userId: user.localId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
      };
    } catch {
      // Fall through to refresh-token recovery.
    }
  }

  if (!refreshToken) return null;

  try {
    const session = await refreshSession(refreshToken);
    const user = mapMember(session.user);
    return {
      accessToken: session.access_token,
      userId: user.localId,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
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

function parseTarget(url: URL) {
  const targetType = url.searchParams.get('targetType')?.trim() as ReviewTargetType | undefined;
  const targetKey = url.searchParams.get('targetKey')?.trim() || '';

  if (targetType === 'site' && targetKey === 'site') return { targetType, targetKey };
  if (targetType === 'article' && targetKey && blogBySlug[targetKey]) return { targetType, targetKey };
  return null;
}

function parseBodyTarget(body: Record<string, unknown>) {
  const targetType = body.targetType === 'site' || body.targetType === 'article' ? body.targetType : null;
  const targetKey = typeof body.targetKey === 'string' ? body.targetKey.trim() : '';
  if (targetType === 'site' && targetKey === 'site') return { targetType, targetKey } as const;
  if (targetType === 'article' && targetKey && blogBySlug[targetKey]) return { targetType, targetKey } as const;
  return null;
}

function mapReview(row: ReviewRow, own = false) {
  return {
    id: row.id,
    rating: Number(row.rating),
    body: row.body,
    authorName: row.author_name,
    avatarUrl: row.avatar_url || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    own,
  };
}

async function readSummary(targetType: ReviewTargetType, targetKey: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_content_review_summary`, {
    method: 'POST',
    headers: publicHeaders(true),
    body: JSON.stringify({ p_target_type: targetType, p_target_key: targetKey }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('REVIEW_SUMMARY_FAILED');
  const rows = await response.json() as SummaryRow[];
  const row = rows[0] || {
    review_count: 0,
    average_rating: 0,
    star_5: 0,
    star_4: 0,
    star_3: 0,
    star_2: 0,
    star_1: 0,
  };
  return {
    count: Number(row.review_count || 0),
    average: Number(row.average_rating || 0),
    distribution: {
      5: Number(row.star_5 || 0),
      4: Number(row.star_4 || 0),
      3: Number(row.star_3 || 0),
      2: Number(row.star_2 || 0),
      1: Number(row.star_1 || 0),
    },
  };
}

async function readPublishedReviews(targetType: ReviewTargetType, targetKey: string, offset: number) {
  const query = new URLSearchParams({
    select: 'id,rating,body,author_name,avatar_url,created_at,updated_at',
    target_type: `eq.${targetType}`,
    target_key: `eq.${targetKey}`,
    status: 'eq.published',
    order: 'created_at.desc',
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/content_reviews?${query}`, {
    headers: publicHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('REVIEWS_READ_FAILED');
  return response.json() as Promise<ReviewRow[]>;
}

async function readOwnReview(session: ResolvedSession, targetType: ReviewTargetType, targetKey: string) {
  const query = new URLSearchParams({
    select: 'id,user_id,rating,body,author_name,avatar_url,status,created_at,updated_at',
    user_id: `eq.${session.userId}`,
    target_type: `eq.${targetType}`,
    target_key: `eq.${targetKey}`,
    limit: '1',
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/content_reviews?${query}`, {
    headers: memberHeaders(session.accessToken),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('OWN_REVIEW_READ_FAILED');
  const rows = await response.json() as ReviewRow[];
  return rows[0] || null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = parseTarget(url);
  if (!target) return NextResponse.json({ error: 'هدف التقييم غير صالح.' }, { status: 400 });

  const offsetRaw = Number(url.searchParams.get('offset') || 0);
  const offset = Number.isInteger(offsetRaw) && offsetRaw >= 0 ? Math.min(offsetRaw, 600) : 0;
  const session = await resolveSession();

  try {
    const [summary, reviews, ownReview] = await Promise.all([
      readSummary(target.targetType, target.targetKey),
      readPublishedReviews(target.targetType, target.targetKey, offset),
      session ? readOwnReview(session, target.targetType, target.targetKey) : Promise.resolve(null),
    ]);

    return respond({
      authenticated: Boolean(session),
      emailVerified: Boolean(session?.emailVerified),
      summary,
      reviews: reviews.map((row) => mapReview(row, row.id === ownReview?.id)),
      myReview: ownReview ? mapReview(ownReview, true) : null,
      nextOffset: offset + reviews.length < summary.count ? offset + reviews.length : null,
      pageSize: PAGE_SIZE,
    }, session);
  } catch {
    return respond({ error: 'تعذر تحميل تقييمات الأعضاء الآن.' }, session, 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });

  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });
  if (!session.emailVerified) return respond({ error: 'أكد بريدك الإلكتروني أولًا قبل نشر التقييم.' }, session, 403);

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const target = parseBodyTarget(body);
  const rating = Number(body.rating);
  const reviewText = typeof body.review === 'string' ? body.review.trim() : '';

  if (!target || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return respond({ error: 'اختر تقييمًا صحيحًا من نجمة إلى خمس نجوم.' }, session, 400);
  }
  if (reviewText.length < REVIEW_MIN_LENGTH || reviewText.length > REVIEW_MAX_LENGTH) {
    return respond({ error: `اكتب رأيك في ${REVIEW_MIN_LENGTH} إلى ${REVIEW_MAX_LENGTH} حرفًا.` }, session, 400);
  }

  try {
    const ownReview = await readOwnReview(session, target.targetType, target.targetKey);
    const payload = {
      rating,
      body: reviewText,
      author_name: session.displayName.slice(0, 100),
      avatar_url: session.avatarUrl ? session.avatarUrl.slice(0, 500) : null,
    };

    let response: Response;
    if (ownReview) {
      const query = new URLSearchParams({ id: `eq.${ownReview.id}`, user_id: `eq.${session.userId}` });
      response = await fetch(`${SUPABASE_URL}/rest/v1/content_reviews?${query}`, {
        method: 'PATCH',
        headers: {
          ...memberHeaders(session.accessToken, true),
          Prefer: 'return=representation',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });
    } else {
      response = await fetch(`${SUPABASE_URL}/rest/v1/content_reviews`, {
        method: 'POST',
        headers: {
          ...memberHeaders(session.accessToken, true),
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          user_id: session.userId,
          target_type: target.targetType,
          target_key: target.targetKey,
          ...payload,
        }),
        cache: 'no-store',
      });
    }

    if (!response.ok) throw new Error('REVIEW_WRITE_FAILED');
    const rows = await response.json() as ReviewRow[];
    return respond({ review: rows[0] ? mapReview(rows[0], true) : null, updated: Boolean(ownReview) }, session);
  } catch {
    return respond({ error: 'تعذر حفظ تقييمك الآن. حاول مرة أخرى.' }, session, 500);
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });

  const url = new URL(request.url);
  const target = parseTarget(url);
  if (!target) return NextResponse.json({ error: 'هدف التقييم غير صالح.' }, { status: 400 });

  const session = await resolveSession();
  if (!session) return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });

  try {
    const query = new URLSearchParams({
      user_id: `eq.${session.userId}`,
      target_type: `eq.${target.targetType}`,
      target_key: `eq.${target.targetKey}`,
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/content_reviews?${query}`, {
      method: 'DELETE',
      headers: { ...memberHeaders(session.accessToken), Prefer: 'return=minimal' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('REVIEW_DELETE_FAILED');
    return respond({ deleted: true }, session);
  } catch {
    return respond({ error: 'تعذر حذف تقييمك الآن.' }, session, 500);
  }
}
