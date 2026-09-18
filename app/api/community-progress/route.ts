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
} from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ResolvedSession = {
  accessToken: string;
  userId: string;
  refreshed?: { accessToken: string; refreshToken: string; expiresIn: number };
};

type StatsRow = {
  review_count: number | string;
  reply_count: number | string;
  like_received: number | string;
  helpful_received: number | string;
  helpful_people: number | string;
};

type ProfileRow = {
  slug: string;
  display_name: string;
  is_public: boolean;
};

type ReviewRow = {
  id: string;
  target_type: 'site' | 'article';
  target_key: string;
  rating: number;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type ReplyRow = {
  id: string;
  review_id: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type ParentReviewRow = {
  id: string;
  target_type: 'site' | 'article';
  target_key: string;
};

function restHeaders(accessToken: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: 'Bearer ' + accessToken,
    Accept: 'application/json',
  };
}

async function resolveSession(): Promise<ResolvedSession | null> {
  const store = await cookies();
  const accessToken = store.get(AUTH_ACCESS_COOKIE)?.value;
  const refreshToken = store.get(AUTH_REFRESH_COOKIE)?.value;

  if (accessToken) {
    try {
      const member = mapMember(await getUser(accessToken));
      return { accessToken, userId: member.localId };
    } catch {
      // Recover from the refresh token below.
    }
  }
  if (!refreshToken) return null;

  try {
    const session = await refreshSession(refreshToken);
    const member = mapMember(session.user);
    return {
      accessToken: session.access_token,
      userId: member.localId,
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
    headers: restHeaders(accessToken),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('COMMUNITY_PROGRESS_READ_FAILED:' + path);
  return response.json() as Promise<T[]>;
}

function contributionHref(targetType: 'site' | 'article', targetKey: string, reviewId: string) {
  return targetType === 'site'
    ? '/#review-' + reviewId
    : '/blog/' + encodeURIComponent(targetKey) + '#review-' + reviewId;
}

function contextLabel(targetType: 'site' | 'article', targetKey: string) {
  if (targetType === 'site') return 'دليل العسيرات';
  return blogBySlug[targetKey]?.title || 'مقال من مدونة العسيرات';
}

function percent(current: number, target: number) {
  if (target <= 0) return 100;
  return Math.min(100, Math.round((current / target) * 100));
}

export async function GET() {
  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const [statsRows, profileRows, reviews, replies] = await Promise.all([
      readRows<StatsRow>(
        'public_member_stats?select=review_count,reply_count,like_received,helpful_received,helpful_people&user_id=eq.' + encodeURIComponent(session.userId) + '&limit=1',
        session.accessToken,
      ).catch(() => []),
      readRows<ProfileRow>(
        'member_public_profiles?select=slug,display_name,is_public&user_id=eq.' + encodeURIComponent(session.userId) + '&limit=1',
        session.accessToken,
      ).catch(() => []),
      readRows<ReviewRow>(
        'content_reviews?select=id,target_type,target_key,rating,body,status,created_at,updated_at&user_id=eq.' + encodeURIComponent(session.userId) + '&order=created_at.desc&limit=20',
        session.accessToken,
      ),
      readRows<ReplyRow>(
        'content_review_replies?select=id,review_id,body,status,created_at,updated_at&user_id=eq.' + encodeURIComponent(session.userId) + '&order=created_at.desc&limit=20',
        session.accessToken,
      ),
    ]);

    const stats = statsRows[0];
    const reviewCount = Number(stats?.review_count || 0);
    const replyCount = Number(stats?.reply_count || 0);
    const contributionCount = reviewCount + replyCount;
    const likeReceived = Number(stats?.like_received || 0);
    const helpfulReceived = Number(stats?.helpful_received || 0);
    const helpfulPeople = Number(stats?.helpful_people || 0);

    const parentIds = [...new Set(replies.map((row) => row.review_id))];
    const parents = parentIds.length
      ? await readRows<ParentReviewRow>(
        'content_reviews?select=id,target_type,target_key&id=in.(' + parentIds.join(',') + ')&limit=' + parentIds.length,
        session.accessToken,
      )
      : [];
    const parentIndex = new Map(parents.map((row) => [row.id, row]));

    const history = [
      ...reviews.map((review) => ({
        id: review.id,
        kind: 'review' as const,
        body: review.body,
        status: review.status,
        rating: Number(review.rating),
        createdAt: review.created_at,
        updatedAt: review.updated_at,
        contextLabel: contextLabel(review.target_type, review.target_key),
        href: contributionHref(review.target_type, review.target_key, review.id),
      })),
      ...replies.flatMap((reply) => {
        const parent = parentIndex.get(reply.review_id);
        if (!parent) return [];
        return [{
          id: reply.id,
          kind: 'reply' as const,
          body: reply.body,
          status: reply.status,
          rating: null,
          createdAt: reply.created_at,
          updatedAt: reply.updated_at,
          contextLabel: contextLabel(parent.target_type, parent.target_key),
          href: contributionHref(parent.target_type, parent.target_key, reply.review_id),
        }];
      }),
    ]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 20);

    const activeUnlocked = contributionCount >= 3;
    const trustedUnlocked = contributionCount >= 5 && helpfulReceived >= 3 && helpfulPeople >= 2;

    return respond({
      authenticated: true,
      profile: {
        displayName: profileRows[0]?.display_name || '',
        slug: profileRows[0]?.slug || '',
        isPublic: Boolean(profileRows[0]?.is_public),
      },
      summary: {
        reviewCount,
        replyCount,
        contributionCount,
        likeReceived,
        helpfulReceived,
        helpfulPeople,
      },
      badges: {
        active: {
          unlocked: activeUnlocked,
          label: 'عضو نشط',
          contributionCurrent: contributionCount,
          contributionTarget: 3,
          percent: percent(contributionCount, 3),
        },
        trusted: {
          unlocked: trustedUnlocked,
          label: 'مساهم موثوق',
          contributions: {
            current: contributionCount,
            target: 5,
            percent: percent(contributionCount, 5),
          },
          helpful: {
            current: helpfulReceived,
            target: 3,
            percent: percent(helpfulReceived, 3),
          },
          people: {
            current: helpfulPeople,
            target: 2,
            percent: percent(helpfulPeople, 2),
          },
        },
      },
      history,
    }, session);
  } catch {
    return respond({ error: 'تعذر تحميل سجل مساهماتك وتقدم الشارات الآن.' }, session, 500);
  }
}
