import { blogBySlug } from '@/lib/blog-published';
import { readCommunityReactionSummaries, type CommunityReactionSummary } from '@/lib/community-reactions';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/auth/supabase-rest';
import { fetchSupabasePublicJson } from '@/lib/supabase-public-fetch';

export type CommunityActivityItem = {
  id: string;
  kind: 'review' | 'reply';
  body: string;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
  href: string;
  contextLabel: string;
  reactions: CommunityReactionSummary;
  weeklyHelpfulCount: number;
  author: {
    slug: string;
    displayName: string;
    avatarUrl: string;
    location: string;
  };
};

type ProfileRow = {
  user_id: string;
  slug: string;
  display_name: string;
  avatar_url: string | null;
  village: string | null;
  locality: string | null;
  show_location: boolean;
};

type ReviewRow = {
  id: string;
  user_id: string;
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
  user_id: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type DailyReactionRow = {
  target_id: string;
  helpful_count: number | string;
};

function publicHeaders() {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: 'Bearer ' + SUPABASE_PUBLISHABLE_KEY,
    Accept: 'application/json',
  };
}

function profileLocation(profile: ProfileRow) {
  if (!profile.show_location) return '';
  return [profile.locality || '', profile.village || ''].filter(Boolean).join(' · ');
}

function reviewHref(review: Pick<ReviewRow, 'id' | 'target_type' | 'target_key'>) {
  return review.target_type === 'site'
    ? '/#review-' + review.id
    : '/blog/' + encodeURIComponent(review.target_key) + '#review-' + review.id;
}

function reviewContext(review: Pick<ReviewRow, 'target_type' | 'target_key'>) {
  if (review.target_type === 'site') return 'دليل العسيرات';
  return blogBySlug[review.target_key]?.title || 'مقال من مدونة العسيرات';
}

function sevenDayStartLocal() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year')?.value || '1970');
  const month = Number(parts.find((part) => part.type === 'month')?.value || '1');
  const day = Number(parts.find((part) => part.type === 'day')?.value || '1');
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() - 6);
  return value.toISOString().slice(0, 10);
}

async function readWeeklyHelpfulCounts(
  targetType: 'review' | 'reply',
  targetIds: string[],
) {
  const ids = [...new Set(targetIds.filter(Boolean))].slice(0, 100);
  const result = new Map<string, number>(ids.map((id) => [id, 0]));
  if (!ids.length) return result;

  const query = new URLSearchParams({
    select: 'target_id,helpful_count',
    target_type: 'eq.' + targetType,
    target_id: 'in.(' + ids.join(',') + ')',
    activity_date: 'gte.' + sevenDayStartLocal(),
    limit: String(Math.max(20, ids.length * 7)),
  });

  const response = await fetch(
    SUPABASE_URL + '/rest/v1/community_reaction_daily_totals?' + query.toString(),
    { headers: publicHeaders(), cache: 'no-store' },
  );
  if (!response.ok) return result;

  const rows = await response.json() as DailyReactionRow[];
  for (const row of rows) {
    result.set(
      row.target_id,
      (result.get(row.target_id) || 0) + Number(row.helpful_count || 0),
    );
  }
  return result;
}

async function readVisibleProfiles(userIds?: string[]) {
  const params = new URLSearchParams({
    select: 'user_id,slug,display_name,avatar_url,village,locality,show_location',
    is_public: 'eq.true',
    limit: '100',
  });
  if (userIds?.length) {
    const ids = [...new Set(userIds.filter(Boolean))].slice(0, 100);
    if (!ids.length) return [];
    params.set('user_id', 'in.(' + ids.join(',') + ')');
  }

  const profiles = await fetchSupabasePublicJson<ProfileRow[]>(
    SUPABASE_URL + '/rest/v1/member_public_profiles?' + params.toString(),
    { headers: publicHeaders(), cache: 'no-store' },
  );
  return profiles || [];
}

export async function getPublicCommunityActivityForUserIds(
  userIds: string[],
  limit = 36,
): Promise<CommunityActivityItem[]> {
  const visibleProfiles = await readVisibleProfiles(userIds);
  if (!visibleProfiles.length) return [];

  const profileIndex = new Map(visibleProfiles.map((profile) => [profile.user_id, profile]));
  const visibleUserIds = visibleProfiles.map((profile) => profile.user_id);
  const inUsers = 'in.(' + visibleUserIds.join(',') + ')';
  const fetchLimit = String(Math.max(limit, 40));

  const reviewParams = new URLSearchParams({
    select: 'id,user_id,target_type,target_key,rating,body,status,created_at,updated_at',
    user_id: inUsers,
    status: 'eq.published',
    order: 'created_at.desc',
    limit: fetchLimit,
  });
  const replyParams = new URLSearchParams({
    select: 'id,review_id,user_id,body,status,created_at,updated_at',
    user_id: inUsers,
    status: 'eq.published',
    order: 'created_at.desc',
    limit: fetchLimit,
  });

  const [reviews, replies] = await Promise.all([
    fetchSupabasePublicJson<ReviewRow[]>(
      SUPABASE_URL + '/rest/v1/content_reviews?' + reviewParams.toString(),
      { headers: publicHeaders(), cache: 'no-store' },
    ),
    fetchSupabasePublicJson<ReplyRow[]>(
      SUPABASE_URL + '/rest/v1/content_review_replies?' + replyParams.toString(),
      { headers: publicHeaders(), cache: 'no-store' },
    ),
  ]);

  const reviewRows = reviews || [];
  const replyRows = replies || [];
  const parentIds = [...new Set(replyRows.map((reply) => reply.review_id))];
  const missingParentIds = parentIds.filter((id) => !reviewRows.some((review) => review.id === id));

  const parentRows = missingParentIds.length
    ? await fetchSupabasePublicJson<ReviewRow[]>(
      SUPABASE_URL + '/rest/v1/content_reviews?' + new URLSearchParams({
        select: 'id,user_id,target_type,target_key,rating,body,status,created_at,updated_at',
        id: 'in.(' + missingParentIds.join(',') + ')',
        status: 'eq.published',
        limit: String(missingParentIds.length),
      }).toString(),
      { headers: publicHeaders(), cache: 'no-store' },
    )
    : [];

  const parentIndex = new Map(
    [...reviewRows, ...(parentRows || [])].map((review) => [review.id, review]),
  );

  const [reviewReactions, replyReactions, weeklyReviewHelpful, weeklyReplyHelpful] = await Promise.all([
    readCommunityReactionSummaries('review', reviewRows.map((review) => review.id)),
    readCommunityReactionSummaries('reply', replyRows.map((reply) => reply.id)),
    readWeeklyHelpfulCounts('review', reviewRows.map((review) => review.id)),
    readWeeklyHelpfulCounts('reply', replyRows.map((reply) => reply.id)),
  ]);

  const reviewItems = reviewRows.flatMap((review): CommunityActivityItem[] => {
    const profile = profileIndex.get(review.user_id);
    if (!profile) return [];
    return [{
      id: review.id,
      kind: 'review',
      body: review.body,
      rating: Number(review.rating),
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      href: reviewHref(review),
      contextLabel: reviewContext(review),
      reactions: reviewReactions.get(review.id) || {
        likeCount: 0,
        helpfulCount: 0,
        liked: false,
        helpful: false,
      },
      weeklyHelpfulCount: weeklyReviewHelpful.get(review.id) || 0,
      author: {
        slug: profile.slug,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url || '',
        location: profileLocation(profile),
      },
    }];
  });

  const replyItems = replyRows.flatMap((reply): CommunityActivityItem[] => {
    const profile = profileIndex.get(reply.user_id);
    const parent = parentIndex.get(reply.review_id);
    if (!profile || !parent) return [];
    return [{
      id: reply.id,
      kind: 'reply',
      body: reply.body,
      rating: null,
      createdAt: reply.created_at,
      updatedAt: reply.updated_at,
      href: reviewHref(parent),
      contextLabel: reviewContext(parent),
      reactions: replyReactions.get(reply.id) || {
        likeCount: 0,
        helpfulCount: 0,
        liked: false,
        helpful: false,
      },
      weeklyHelpfulCount: weeklyReplyHelpful.get(reply.id) || 0,
      author: {
        slug: profile.slug,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url || '',
        location: profileLocation(profile),
      },
    }];
  });

  return [...reviewItems, ...replyItems]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, Math.max(1, Math.min(limit, 60)));
}


export type CommunityWeeklyPulse = {
  contributionCount: number;
  activeMemberCount: number;
  helpfulCount: number;
  topHelpful: CommunityActivityItem[];
};

function cairoDate(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export async function getCommunityWeeklyPulse(): Promise<CommunityWeeklyPulse> {
  const items = await getPublicCommunityActivity(60);
  const start = sevenDayStartLocal();
  const recent = items.filter((item) => cairoDate(item.createdAt) >= start);
  const authors = new Set(recent.map((item) => item.author.slug));
  const helpfulCount = items.reduce(
    (sum, item) => sum + Math.max(0, Number(item.weeklyHelpfulCount || 0)),
    0,
  );
  const topHelpful = items
    .filter((item) => item.weeklyHelpfulCount > 0)
    .sort((a, b) =>
      b.weeklyHelpfulCount - a.weeklyHelpfulCount
      || b.reactions.helpfulCount - a.reactions.helpfulCount
      || Date.parse(b.createdAt) - Date.parse(a.createdAt),
    )
    .slice(0, 3);

  return {
    contributionCount: recent.length,
    activeMemberCount: authors.size,
    helpfulCount,
    topHelpful,
  };
}

export async function getPublicCommunityActivity(limit = 36): Promise<CommunityActivityItem[]> {
  const visibleProfiles = await readVisibleProfiles();
  if (!visibleProfiles.length) return [];
  return getPublicCommunityActivityForUserIds(
    visibleProfiles.map((profile) => profile.user_id),
    limit,
  );
}
