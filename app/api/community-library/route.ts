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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ResolvedSession = {
  accessToken: string;
  userId: string;
  emailVerified: boolean;
  refreshed?: { accessToken: string; refreshToken: string; expiresIn: number };
};

type SavedRow = {
  id: string;
  review_id: string | null;
  reply_id: string | null;
  created_at: string;
};

type WatchRow = {
  id: string;
  review_id: string;
  created_at: string;
};

type ReviewRow = {
  id: string;
  user_id: string;
  target_type: 'site' | 'article';
  target_key: string;
  rating: number;
  body: string;
  author_name: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type ReplyRow = {
  id: string;
  review_id: string;
  user_id: string;
  body: string;
  author_name: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type LibrarySavedItem = {
  id: string;
  targetType: 'review' | 'reply';
  targetId: string;
  reviewId: string;
  authorName: string;
  body: string;
  rating: number | null;
  contextLabel: string;
  href: string;
  contributionCreatedAt: string;
  savedAt: string;
};

function headers(accessToken: string, json = false) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: 'Bearer ' + accessToken,
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
        emailVerified: user.emailVerified,
      };
    } catch {
      // Recover with the refresh token below.
    }
  }

  if (!refreshToken) return null;

  try {
    const session = await refreshSession(refreshToken);
    const user = mapMember(session.user);
    return {
      accessToken: session.access_token,
      userId: user.localId,
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

async function readRows<T>(path: string, accessToken: string): Promise<T[]> {
  const response = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: headers(accessToken),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('COMMUNITY_LIBRARY_READ_FAILED:' + path);
  return response.json() as Promise<T[]>;
}

function contextLabel(review: Pick<ReviewRow, 'target_type' | 'target_key'>) {
  if (review.target_type === 'site') return 'دليل العسيرات';
  return blogBySlug[review.target_key]?.title || 'مقال من مدونة العسيرات';
}

function contributionHref(review: Pick<ReviewRow, 'id' | 'target_type' | 'target_key'>) {
  return review.target_type === 'site'
    ? '/#review-' + review.id
    : '/blog/' + encodeURIComponent(review.target_key) + '#review-' + review.id;
}

async function readPublishedReview(reviewId: string, accessToken: string) {
  const rows = await readRows<ReviewRow>(
    'content_reviews?select=id,user_id,target_type,target_key,rating,body,author_name,status,created_at,updated_at'
    + '&id=eq.' + encodeURIComponent(reviewId)
    + '&status=eq.published&limit=1',
    accessToken,
  );
  return rows[0] || null;
}

async function readPublishedReply(replyId: string, accessToken: string) {
  const rows = await readRows<ReplyRow>(
    'content_review_replies?select=id,review_id,user_id,body,author_name,status,created_at,updated_at'
    + '&id=eq.' + encodeURIComponent(replyId)
    + '&status=eq.published&limit=1',
    accessToken,
  );
  return rows[0] || null;
}

async function targetState(
  session: ResolvedSession,
  targetType: 'review' | 'reply',
  targetId: string,
) {
  const savedFilter = targetType === 'review'
    ? 'review_id=eq.' + encodeURIComponent(targetId)
    : 'reply_id=eq.' + encodeURIComponent(targetId);

  const [savedRows, watchRows] = await Promise.all([
    readRows<SavedRow>(
      'community_saved_contributions?select=id,review_id,reply_id,created_at'
      + '&user_id=eq.' + encodeURIComponent(session.userId)
      + '&' + savedFilter + '&limit=1',
      session.accessToken,
    ),
    targetType === 'review'
      ? readRows<WatchRow>(
        'community_thread_watches?select=id,review_id,created_at'
        + '&user_id=eq.' + encodeURIComponent(session.userId)
        + '&review_id=eq.' + encodeURIComponent(targetId)
        + '&limit=1',
        session.accessToken,
      )
      : Promise.resolve([]),
  ]);

  return {
    saved: Boolean(savedRows[0]),
    watching: Boolean(watchRows[0]),
  };
}

export async function GET(request: Request) {
  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({
      authenticated: false,
      emailVerified: false,
      saved: false,
      watching: false,
      savedItems: [],
      watchedThreads: [],
    }, { status: 401 });
  }

  const url = new URL(request.url);
  const targetType = url.searchParams.get('targetType');
  const targetId = url.searchParams.get('targetId')?.trim() || '';

  if (targetType || targetId) {
    if ((targetType !== 'review' && targetType !== 'reply') || !UUID_PATTERN.test(targetId)) {
      return respond({ error: 'المساهمة المطلوبة غير صحيحة.' }, session, 400);
    }

    try {
      const state = await targetState(session, targetType, targetId);
      return respond({
        authenticated: true,
        emailVerified: session.emailVerified,
        ...state,
      }, session);
    } catch {
      return respond({ error: 'تعذر تحميل حالة المساهمة الآن.' }, session, 500);
    }
  }

  try {
    const [savedRows, watchRows] = await Promise.all([
      readRows<SavedRow>(
        'community_saved_contributions?select=id,review_id,reply_id,created_at'
        + '&user_id=eq.' + encodeURIComponent(session.userId)
        + '&order=created_at.desc&limit=60',
        session.accessToken,
      ),
      readRows<WatchRow>(
        'community_thread_watches?select=id,review_id,created_at'
        + '&user_id=eq.' + encodeURIComponent(session.userId)
        + '&order=created_at.desc&limit=60',
        session.accessToken,
      ),
    ]);

    const directReviewIds = savedRows.map((row) => row.review_id).filter(Boolean) as string[];
    const savedReplyIds = savedRows.map((row) => row.reply_id).filter(Boolean) as string[];
    const watchReviewIds = watchRows.map((row) => row.review_id);
    const reviewIds = [...new Set([...directReviewIds, ...watchReviewIds])];

    const savedReplies = savedReplyIds.length
      ? await readRows<ReplyRow>(
        'content_review_replies?select=id,review_id,user_id,body,author_name,status,created_at,updated_at'
        + '&id=in.(' + savedReplyIds.join(',') + ')'
        + '&status=eq.published&limit=' + savedReplyIds.length,
        session.accessToken,
      )
      : [];

    const replyParentIds = savedReplies.map((row) => row.review_id);
    const allReviewIds = [...new Set([...reviewIds, ...replyParentIds])];

    const reviews = allReviewIds.length
      ? await readRows<ReviewRow>(
        'content_reviews?select=id,user_id,target_type,target_key,rating,body,author_name,status,created_at,updated_at'
        + '&id=in.(' + allReviewIds.join(',') + ')'
        + '&status=eq.published&limit=' + allReviewIds.length,
        session.accessToken,
      )
      : [];

    const reviewIndex = new Map(reviews.map((row) => [row.id, row]));
    const replyIndex = new Map(savedReplies.map((row) => [row.id, row]));

    const savedItems = savedRows.flatMap<LibrarySavedItem>((saved) => {
      if (saved.review_id) {
        const review = reviewIndex.get(saved.review_id);
        if (!review) return [];
        return [{
          id: saved.id,
          targetType: 'review' as const,
          targetId: review.id,
          reviewId: review.id,
          authorName: review.author_name,
          body: review.body,
          rating: Number(review.rating),
          contextLabel: contextLabel(review),
          href: contributionHref(review),
          contributionCreatedAt: review.created_at,
          savedAt: saved.created_at,
        }];
      }

      if (saved.reply_id) {
        const reply = replyIndex.get(saved.reply_id);
        const parent = reply ? reviewIndex.get(reply.review_id) : null;
        if (!reply || !parent) return [];
        return [{
          id: saved.id,
          targetType: 'reply' as const,
          targetId: reply.id,
          reviewId: parent.id,
          authorName: reply.author_name,
          body: reply.body,
          rating: null,
          contextLabel: contextLabel(parent),
          href: contributionHref(parent),
          contributionCreatedAt: reply.created_at,
          savedAt: saved.created_at,
        }];
      }

      return [];
    });

    const watchedThreads = watchRows.flatMap((watch) => {
      const review = reviewIndex.get(watch.review_id);
      if (!review) return [];
      return [{
        id: watch.id,
        reviewId: review.id,
        authorName: review.author_name,
        body: review.body,
        rating: Number(review.rating),
        contextLabel: contextLabel(review),
        href: contributionHref(review),
        contributionCreatedAt: review.created_at,
        watchedAt: watch.created_at,
      }];
    });

    return respond({
      authenticated: true,
      emailVerified: session.emailVerified,
      savedItems,
      watchedThreads,
    }, session);
  } catch {
    return respond({ error: 'تعذر تحميل محفوظات المجتمع الآن.' }, session, 500);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  }

  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ error: 'يلزم تسجيل الدخول أولًا.' }, { status: 401 });
  }
  if (!session.emailVerified) {
    return respond({ error: 'أكد بريدك الإلكتروني أولًا لاستخدام محفوظات المجتمع.' }, session, 403);
  }

  const body = await request.json().catch(() => ({})) as {
    action?: unknown;
    targetType?: unknown;
    targetId?: unknown;
  };
  const action = typeof body.action === 'string' ? body.action : '';
  const targetType = body.targetType === 'review' || body.targetType === 'reply'
    ? body.targetType
    : '';
  const targetId = typeof body.targetId === 'string' ? body.targetId.trim() : '';

  if (!['save', 'unsave', 'watch', 'unwatch'].includes(action)
      || !targetType
      || !UUID_PATTERN.test(targetId)) {
    return respond({ error: 'بيانات الإجراء غير صحيحة.' }, session, 400);
  }
  if ((action === 'watch' || action === 'unwatch') && targetType !== 'review') {
    return respond({ error: 'متابعة النقاش متاحة للتقييمات فقط.' }, session, 400);
  }

  try {
    if (action === 'save') {
      const target = targetType === 'review'
        ? await readPublishedReview(targetId, session.accessToken)
        : await readPublishedReply(targetId, session.accessToken);
      if (!target) return respond({ error: 'المساهمة غير متاحة للحفظ.' }, session, 404);

      const payload = targetType === 'review'
        ? { user_id: session.userId, review_id: targetId }
        : { user_id: session.userId, reply_id: targetId };

      const response = await fetch(SUPABASE_URL + '/rest/v1/community_saved_contributions', {
        method: 'POST',
        headers: {
          ...headers(session.accessToken, true),
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      if (!response.ok && response.status !== 409) throw new Error('SAVE_FAILED');
    }

    if (action === 'unsave') {
      const query = new URLSearchParams({
        user_id: 'eq.' + session.userId,
        [targetType === 'review' ? 'review_id' : 'reply_id']: 'eq.' + targetId,
      });
      const response = await fetch(
        SUPABASE_URL + '/rest/v1/community_saved_contributions?' + query.toString(),
        {
          method: 'DELETE',
          headers: { ...headers(session.accessToken), Prefer: 'return=minimal' },
          cache: 'no-store',
        },
      );
      if (!response.ok) throw new Error('UNSAVE_FAILED');
    }

    if (action === 'watch') {
      const review = await readPublishedReview(targetId, session.accessToken);
      if (!review) return respond({ error: 'النقاش غير متاح للمتابعة.' }, session, 404);
      if (review.user_id === session.userId) {
        return respond({ error: 'أنت صاحب التقييم وستصلك الردود تلقائيًا.' }, session, 400);
      }

      const response = await fetch(SUPABASE_URL + '/rest/v1/community_thread_watches', {
        method: 'POST',
        headers: {
          ...headers(session.accessToken, true),
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          user_id: session.userId,
          review_id: targetId,
        }),
        cache: 'no-store',
      });

      if (!response.ok && response.status !== 409) throw new Error('WATCH_FAILED');
    }

    if (action === 'unwatch') {
      const query = new URLSearchParams({
        user_id: 'eq.' + session.userId,
        review_id: 'eq.' + targetId,
      });
      const response = await fetch(
        SUPABASE_URL + '/rest/v1/community_thread_watches?' + query.toString(),
        {
          method: 'DELETE',
          headers: { ...headers(session.accessToken), Prefer: 'return=minimal' },
          cache: 'no-store',
        },
      );
      if (!response.ok) throw new Error('UNWATCH_FAILED');
    }

    const state = await targetState(session, targetType, targetId);
    return respond({ saved: state.saved, watching: state.watching }, session);
  } catch {
    return respond({ error: 'تعذر تحديث محفوظات المجتمع الآن. حاول مرة أخرى.' }, session, 500);
  }
}
