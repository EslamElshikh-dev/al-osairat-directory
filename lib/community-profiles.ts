import { blogBySlug } from '@/lib/blog-published';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/auth/supabase-rest';
import { fetchSupabasePublicJson } from '@/lib/supabase-public-fetch';

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

export type PublicMemberContributionSummary = {
  reviews: PublicMemberReview[];
  reviewCount: number;
  replyCount: number;
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

type ReplyRow = { id: string };

function publicHeaders() {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    Accept: 'application/json',
  };
}

function validSlug(slug: string) {
  return /^[a-z0-9][a-z0-9-]{7,48}$/.test(slug);
}

export async function getPublicMemberProfileBySlug(slug: string): Promise<(PublicMemberProfile & { userId: string }) | null> {
  if (!validSlug(slug)) return null;
  const params = new URLSearchParams({
    select: 'user_id,slug,display_name,avatar_url,bio,village,locality,show_location,joined_at',
    slug: `eq.${slug}`,
    is_public: 'eq.true',
    limit: '1',
  });
  const rows = await fetchSupabasePublicJson<ProfileRow[]>(
    `${SUPABASE_URL}/rest/v1/member_public_profiles?${params.toString()}`,
    { headers: publicHeaders() },
  );
  const row = rows?.[0];
  if (!row) return null;
  return {
    userId: row.user_id,
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

export async function getPublicMemberContributions(userId: string): Promise<PublicMemberContributionSummary> {
  const reviewParams = new URLSearchParams({
    select: 'id,target_type,target_key,rating,body,created_at,updated_at',
    user_id: `eq.${userId}`,
    status: 'eq.published',
    order: 'created_at.desc',
    limit: '30',
  });
  const replyParams = new URLSearchParams({
    select: 'id',
    user_id: `eq.${userId}`,
    status: 'eq.published',
    limit: '1000',
  });

  const [reviewRows, replyRows] = await Promise.all([
    fetchSupabasePublicJson<ReviewRow[]>(
      `${SUPABASE_URL}/rest/v1/content_reviews?${reviewParams.toString()}`,
      { headers: publicHeaders() },
    ),
    fetchSupabasePublicJson<ReplyRow[]>(
      `${SUPABASE_URL}/rest/v1/content_review_replies?${replyParams.toString()}`,
      { headers: publicHeaders() },
    ),
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
        ? '/#member-reviews-site-site'
        : `/blog/${encodeURIComponent(row.target_key)}#member-reviews-article-${row.target_key}`,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  const averageRating = reviews.length
    ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length
    : 0;

  return {
    reviews,
    reviewCount: reviews.length,
    replyCount: replyRows?.length || 0,
    averageRating: Number(averageRating.toFixed(1)),
  };
}
