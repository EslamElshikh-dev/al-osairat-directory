import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/auth/supabase-rest';

export type CommunityReactionTarget = 'review' | 'reply';

export type CommunityReactionSummary = {
  likeCount: number;
  helpfulCount: number;
  liked: boolean;
  helpful: boolean;
};

type CountRow = {
  target_id: string;
  like_count: number | string;
  helpful_count: number | string;
};

type OwnReactionRow = {
  review_id: string | null;
  reply_id: string | null;
  reaction_type: 'like' | 'helpful';
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const emptyReactionSummary = (): CommunityReactionSummary => ({
  likeCount: 0,
  helpfulCount: 0,
  liked: false,
  helpful: false,
});

function publicHeaders(json = false) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: 'Bearer ' + SUPABASE_PUBLISHABLE_KEY,
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

function memberHeaders(accessToken: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: 'Bearer ' + accessToken,
    Accept: 'application/json',
  };
}

export async function readCommunityReactionSummaries(
  targetType: CommunityReactionTarget,
  targetIds: string[],
  accessToken?: string,
): Promise<Map<string, CommunityReactionSummary>> {
  const ids = [...new Set(targetIds.filter((id) => UUID_PATTERN.test(id)))].slice(0, 100);
  const result = new Map<string, CommunityReactionSummary>(
    ids.map((id) => [id, emptyReactionSummary()]),
  );
  if (!ids.length) return result;

  const countResponse = await fetch(SUPABASE_URL + '/rest/v1/rpc/get_community_reaction_counts', {
    method: 'POST',
    headers: publicHeaders(true),
    body: JSON.stringify({ p_target_type: targetType, p_target_ids: ids }),
    cache: 'no-store',
  });
  if (!countResponse.ok) throw new Error('REACTION_COUNTS_READ_FAILED');

  const counts = await countResponse.json() as CountRow[];
  for (const row of counts) {
    const current = result.get(row.target_id) || emptyReactionSummary();
    result.set(row.target_id, {
      ...current,
      likeCount: Number(row.like_count || 0),
      helpfulCount: Number(row.helpful_count || 0),
    });
  }

  if (!accessToken) return result;

  const targetColumn = targetType === 'review' ? 'review_id' : 'reply_id';
  const query = new URLSearchParams({
    select: 'review_id,reply_id,reaction_type',
    [targetColumn]: 'in.(' + ids.join(',') + ')',
    limit: String(ids.length * 2),
  });
  const ownResponse = await fetch(SUPABASE_URL + '/rest/v1/community_reactions?' + query.toString(), {
    headers: memberHeaders(accessToken),
    cache: 'no-store',
  });
  if (!ownResponse.ok) throw new Error('OWN_REACTIONS_READ_FAILED');

  const ownRows = await ownResponse.json() as OwnReactionRow[];
  for (const row of ownRows) {
    const id = targetType === 'review' ? row.review_id : row.reply_id;
    if (!id) continue;
    const current = result.get(id) || emptyReactionSummary();
    result.set(id, {
      ...current,
      liked: current.liked || row.reaction_type === 'like',
      helpful: current.helpful || row.reaction_type === 'helpful',
    });
  }

  return result;
}

export async function readCommunityReactionSummary(
  targetType: CommunityReactionTarget,
  targetId: string,
  accessToken?: string,
) {
  const summaries = await readCommunityReactionSummaries(targetType, [targetId], accessToken);
  return summaries.get(targetId) || emptyReactionSummary();
}
