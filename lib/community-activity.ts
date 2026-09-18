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

export async function getPublicCommunityActivity(limit = 36): Promise<CommunityActivityItem[]> {
  const profileParams = new URLSearchParams({
    select: 'user_id,slug,display_name,avatar_url,village,locality,show_location',
    is_public: 'eq.true',
    limit: '100',
  });
  const profiles = await fetchSupabasePublicJson<ProfileRow[]>(
    SUPABASE_URL + '/rest/v1/member_public_profiles?' + profileParams.toString(),
    { headers: publicHeaders(), cache: 'no-store' },
  );
  const visibleProfiles = profiles || [];
  if (!visibleProfiles.length) return [];

  const profileIndex = new Map(visibleProfiles.map((profile) => [profile.user_id, profile]));
  const userIds = visibleProfiles.map((profile) => profile.user_id);
  const inUsers = 'in.(' + userIds.join(',') + ')';

  const reviewParams = new URLSearchParams({
    select: 'id,user_id,target_type,target_key,rating,body,status,created_at,updated_at',
    user_id: inUsers,
    status: 'eq.published',
    order: 'created_at.desc',
    limit: String(Math.max(limit, 40)),
  });
  const replyParams = new URLSearchParams({
    select: 'id,review_id,user_id,body,status,created_at,updated_at',
    user_id: inUsers,
    status: 'eq.published',
    order: 'created_at.desc',
    limit: String(Math.max(limit, 40)),
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

  const [reviewReactions, replyReactions] = await Promise.all([
    readCommunityReactionSummaries('review', reviewRows.map((review) => review.id)),
    readCommunityReactionSummaries('reply', replyRows.map((reply) => reply.id)),
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
