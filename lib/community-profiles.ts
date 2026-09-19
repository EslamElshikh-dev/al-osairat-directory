import { blogBySlug } from '@/lib/blog-published';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/auth/supabase-rest';
import { fetchSupabasePublicJson } from '@/lib/supabase-public-fetch';

export type PublicMemberBadge = {
  key: 'active' | 'trusted';
  label: string;
  description: string;
};

export type PublicMemberProfile = {
  slug: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  village: string;
  locality: string;
  showLocation: boolean;
  joinedAt: string;
};

export type PublicMemberReview = {
  id: string;
  rating: number;
  body: string;
  targetType: 'site' | 'article';
  targetKey: string;
  targetLabel: string;
  href: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicMemberReply = {
  id: string;
  reviewId: string;
  body: string;
  targetType: 'site' | 'article';
  targetKey: string;
  targetLabel: string;
  href: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicMemberStats = {
  reviewCount: number;
  replyCount: number;
  contributionCount: number;
  likeReceived: number;
  helpfulReceived: number;
  helpfulPeople: number;
  badges: PublicMemberBadge[];
};

export type PublicMemberDirectoryEntry = PublicMemberProfile & PublicMemberStats;

export type PublicMemberContributionSummary = PublicMemberStats & {
  reviews: PublicMemberReview[];
  replies: PublicMemberReply[];
  averageRating: number;
};

type ProfileRow = {
  user_id: string;
  slug: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  village: string | null;
  locality: string | null;
  show_location: boolean;
  joined_at: string;
};

type ReviewRow = {
  id: string;
  target_type: 'site' | 'article';
  target_key: string;
  rating: number;
  body: string;
  created_at: string;
  updated_at: string;
};

type ReplyRow = {
  id: string;
  review_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

type ParentReviewRow = {
  id: string;
  target_type: 'site' | 'article';
  target_key: string;
};

type StatsRow = {
  user_id: string;
  review_count: number | string;
  reply_count: number | string;
  like_received: number | string;
  helpful_received: number | string;
  helpful_people: number | string;
};

function publicHeaders(json = false) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: 'Bearer ' + SUPABASE_PUBLISHABLE_KEY,
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

function validSlug(slug: string) {
  return /^[a-z0-9][a-z0-9-]{7,48}$/.test(slug);
}

function badgesFor(stats: Omit<PublicMemberStats, 'badges'>): PublicMemberBadge[] {
  const badges: PublicMemberBadge[] = [];
  if (stats.contributionCount >= 3) {
    badges.push({
      key: 'active',
      label: 'عضو نشط',
      description: 'شارك بثلاث مساهمات عامة أو أكثر.',
    });
  }
  if (
    stats.contributionCount >= 5
    && stats.helpfulReceived >= 3
    && stats.helpfulPeople >= 2
  ) {
    badges.push({
      key: 'trusted',
      label: 'مساهم موثوق',
      description: 'مساهمات متكررة حصلت على «مفيد» من أكثر من عضو. هذه شارة مساهمة وليست توثيق هوية.',
    });
  }
  return badges;
}

function emptyStats(): PublicMemberStats {
  const base = {
    reviewCount: 0,
    replyCount: 0,
    contributionCount: 0,
    likeReceived: 0,
    helpfulReceived: 0,
    helpfulPeople: 0,
  };
  return { ...base, badges: badgesFor(base) };
}

async function readPublicMemberStats(userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))].slice(0, 100);
  const result = new Map<string, PublicMemberStats>(ids.map((id) => [id, emptyStats()]));
  if (!ids.length) return result;

  const query = new URLSearchParams({
    select: 'user_id,review_count,reply_count,like_received,helpful_received,helpful_people',
    user_id: 'in.(' + ids.join(',') + ')',
    limit: String(ids.length),
  });
  const response = await fetch(
    SUPABASE_URL + '/rest/v1/public_member_stats?' + query.toString(),
    { headers: publicHeaders(), cache: 'no-store' },
  );
  if (!response.ok) throw new Error('PUBLIC_MEMBER_STATS_READ_FAILED');

  const rows = await response.json() as StatsRow[];
  for (const row of rows) {
    const reviewCount = Number(row.review_count || 0);
    const replyCount = Number(row.reply_count || 0);
    const base = {
      reviewCount,
      replyCount,
      contributionCount: reviewCount + replyCount,
      likeReceived: Number(row.like_received || 0),
      helpfulReceived: Number(row.helpful_received || 0),
      helpfulPeople: Number(row.helpful_people || 0),
    };
    result.set(row.user_id, { ...base, badges: badgesFor(base) });
  }
  return result;
}

function mapProfile(row: ProfileRow): PublicMemberProfile {
  return {
    slug: row.slug,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || '',
    bio: row.bio || '',
    village: row.show_location ? (row.village || '') : '',
    locality: row.show_location ? (row.locality || '') : '',
    showLocation: Boolean(row.show_location),
    joinedAt: row.joined_at,
  };
}

export async function getPublicMembers(): Promise<PublicMemberDirectoryEntry[]> {
  const params = new URLSearchParams({
    select: 'user_id,slug,display_name,avatar_url,bio,village,locality,show_location,joined_at',
    is_public: 'eq.true',
    order: 'joined_at.asc',
    limit: '100',
  });
  const rows = await fetchSupabasePublicJson<ProfileRow[]>(
    SUPABASE_URL + '/rest/v1/member_public_profiles?' + params.toString(),
    { headers: publicHeaders(), cache: 'no-store' },
  );
  const visibleRows = rows || [];
  const stats = await readPublicMemberStats(visibleRows.map((row) => row.user_id));

  return visibleRows
    .map((row) => ({
      ...mapProfile(row),
      ...(stats.get(row.user_id) || emptyStats()),
    }))
    .sort((a, b) => {
      const trustedDelta = Number(b.badges.some((badge) => badge.key === 'trusted'))
        - Number(a.badges.some((badge) => badge.key === 'trusted'));
      if (trustedDelta) return trustedDelta;
      const activeDelta = Number(b.badges.some((badge) => badge.key === 'active'))
        - Number(a.badges.some((badge) => badge.key === 'active'));
      if (activeDelta) return activeDelta;
      if (b.contributionCount !== a.contributionCount) return b.contributionCount - a.contributionCount;
      return a.displayName.localeCompare(b.displayName, 'ar');
    });
}


export async function getSuggestedPublicMembers(
  excludeUserIds: string[],
  limit = 4,
): Promise<PublicMemberDirectoryEntry[]> {
  const excluded = new Set(excludeUserIds.filter(Boolean));
  const params = new URLSearchParams({
    select: 'user_id,slug,display_name,avatar_url,bio,village,locality,show_location,joined_at',
    is_public: 'eq.true',
    order: 'joined_at.asc',
    limit: '100',
  });
  const rows = await fetchSupabasePublicJson<ProfileRow[]>(
    SUPABASE_URL + '/rest/v1/member_public_profiles?' + params.toString(),
    { headers: publicHeaders(), cache: 'no-store' },
  );
  const eligibleRows = (rows || []).filter((row) => !excluded.has(row.user_id));
  const stats = await readPublicMemberStats(eligibleRows.map((row) => row.user_id));

  return eligibleRows
    .map((row) => ({
      ...mapProfile(row),
      ...(stats.get(row.user_id) || emptyStats()),
    }))
    .sort((a, b) => {
      const trustedDelta = Number(b.badges.some((badge) => badge.key === 'trusted'))
        - Number(a.badges.some((badge) => badge.key === 'trusted'));
      if (trustedDelta) return trustedDelta;
      const activeDelta = Number(b.badges.some((badge) => badge.key === 'active'))
        - Number(a.badges.some((badge) => badge.key === 'active'));
      if (activeDelta) return activeDelta;
      if (b.helpfulReceived !== a.helpfulReceived) return b.helpfulReceived - a.helpfulReceived;
      if (b.contributionCount !== a.contributionCount) return b.contributionCount - a.contributionCount;
      return a.displayName.localeCompare(b.displayName, 'ar');
    })
    .slice(0, Math.max(1, Math.min(limit, 8)));
}

export async function getPublicMemberProfileBySlug(slug: string): Promise<(PublicMemberProfile & { userId: string }) | null> {
  if (!validSlug(slug)) return null;
  const params = new URLSearchParams({
    select: 'user_id,slug,display_name,avatar_url,bio,village,locality,show_location,joined_at',
    slug: 'eq.' + slug,
    is_public: 'eq.true',
    limit: '1',
  });
  const rows = await fetchSupabasePublicJson<ProfileRow[]>(
    SUPABASE_URL + '/rest/v1/member_public_profiles?' + params.toString(),
    { headers: publicHeaders(), cache: 'no-store' },
  );
  const row = rows?.[0];
  if (!row) return null;
  return {
    userId: row.user_id,
    ...mapProfile(row),
  };
}

export async function getPublicMemberContributions(userId: string): Promise<PublicMemberContributionSummary> {
  const reviewParams = new URLSearchParams({
    select: 'id,target_type,target_key,rating,body,created_at,updated_at',
    user_id: 'eq.' + userId,
    status: 'eq.published',
    order: 'created_at.desc',
    limit: '30',
  });

  const replyParams = new URLSearchParams({
    select: 'id,review_id,body,created_at,updated_at',
    user_id: 'eq.' + userId,
    status: 'eq.published',
    order: 'created_at.desc',
    limit: '30',
  });

  const [reviewRows, replyRows, stats] = await Promise.all([
    fetchSupabasePublicJson<ReviewRow[]>(
      SUPABASE_URL + '/rest/v1/content_reviews?' + reviewParams.toString(),
      { headers: publicHeaders(), cache: 'no-store' },
    ),
    fetchSupabasePublicJson<ReplyRow[]>(
      SUPABASE_URL + '/rest/v1/content_review_replies?' + replyParams.toString(),
      { headers: publicHeaders(), cache: 'no-store' },
    ),
    readPublicMemberStats([userId]),
  ]);

  const reviews = (reviewRows || []).map((row): PublicMemberReview => {
    const article = row.target_type === 'article' ? blogBySlug[row.target_key] : null;
    return {
      id: row.id,
      rating: Number(row.rating),
      body: row.body,
      targetType: row.target_type,
      targetKey: row.target_key,
      targetLabel: row.target_type === 'site' ? 'دليل العسيرات' : (article?.title || 'مقال من مدونة العسيرات'),
      href: row.target_type === 'site'
        ? '/#review-' + row.id
        : '/blog/' + encodeURIComponent(row.target_key) + '#review-' + row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  const parentIds = [...new Set((replyRows || []).map((row) => row.review_id))];
  const parentParams = new URLSearchParams({
    select: 'id,target_type,target_key',
    id: parentIds.length ? 'in.(' + parentIds.join(',') + ')' : 'in.()',
    status: 'eq.published',
    limit: String(Math.max(1, parentIds.length)),
  });
  const parentRows = parentIds.length
    ? await fetchSupabasePublicJson<ParentReviewRow[]>(
      SUPABASE_URL + '/rest/v1/content_reviews?' + parentParams.toString(),
      { headers: publicHeaders(), cache: 'no-store' },
    )
    : [];
  const parentIndex = new Map((parentRows || []).map((row) => [row.id, row]));

  const replies = (replyRows || []).flatMap((row): PublicMemberReply[] => {
    const parent = parentIndex.get(row.review_id);
    if (!parent) return [];
    const article = parent.target_type === 'article' ? blogBySlug[parent.target_key] : null;
    return [{
      id: row.id,
      reviewId: row.review_id,
      body: row.body,
      targetType: parent.target_type,
      targetKey: parent.target_key,
      targetLabel: parent.target_type === 'site' ? 'دليل العسيرات' : (article?.title || 'مقال من مدونة العسيرات'),
      href: parent.target_type === 'site'
        ? '/#review-' + row.review_id
        : '/blog/' + encodeURIComponent(parent.target_key) + '#review-' + row.review_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }];
  });

  const averageRating = reviews.length
    ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length
    : 0;

  return {
    reviews,
    replies,
    ...(stats.get(userId) || emptyStats()),
    averageRating: Number(averageRating.toFixed(1)),
  };
}
