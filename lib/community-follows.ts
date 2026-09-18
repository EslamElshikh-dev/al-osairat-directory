import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/auth/supabase-rest';

function publicHeaders() {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: 'Bearer ' + SUPABASE_PUBLISHABLE_KEY,
    Accept: 'application/json',
  };
}

type FollowTotalRow = {
  follower_count: number | string;
};

export async function getPublicMemberFollowerCount(userId: string) {
  const query = new URLSearchParams({
    select: 'follower_count',
    user_id: 'eq.' + userId,
    limit: '1',
  });
  const response = await fetch(
    SUPABASE_URL + '/rest/v1/community_follow_totals?' + query.toString(),
    { headers: publicHeaders(), cache: 'no-store' },
  );
  if (!response.ok) return 0;
  const rows = await response.json() as FollowTotalRow[];
  return Number(rows[0]?.follower_count || 0);
}
