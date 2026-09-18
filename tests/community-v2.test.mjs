import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Community V2 stores reaction identities privately and exposes only aggregate RPC counts', async () => {
  const migration = await readProjectFile('supabase/migrations/20260918093000_community_v2_reactions_badges_notifications.sql');

  assert.match(migration, /create table if not exists public\.community_reactions/);
  assert.match(migration, /revoke all on table public\.community_reactions from anon, authenticated/);
  assert.match(migration, /grant select, insert, delete on table public\.community_reactions to authenticated/);
  assert.doesNotMatch(migration, /grant select[^;]*community_reactions[^;]*anon/);
  assert.match(migration, /get_community_reaction_counts/);
  assert.match(migration, /security definer/);
  assert.match(migration, /revoke all on function public\.get_community_reaction_counts/);
});

test('Community V2 prevents self reactions and limits reactions to published contributions', async () => {
  const migration = await readProjectFile('supabase/migrations/20260918093000_community_v2_reactions_badges_notifications.sql');

  assert.match(migration, /r\.user_id <> \(select auth\.uid\(\)\)/);
  assert.match(migration, /rr\.user_id <> \(select auth\.uid\(\)\)/);
  assert.match(migration, /r\.status = 'published'/);
  assert.match(migration, /rr\.status = 'published'/);
  assert.match(migration, /community_reactions_delete_own/);
});

test('public member directory remains opt-in and badges are contribution based', async () => {
  const [page, data] = await Promise.all([
    readProjectFile('app/members/page.tsx'),
    readProjectFile('lib/community-profiles.ts'),
  ]);

  assert.match(page, /أعضاء مجتمع دليل العسيرات/);
  assert.match(page, /تظهر فقط الحسابات التي اختار أصحابها/);
  assert.match(data, /is_public: 'eq\.true'/);
  assert.match(data, /contributionCount >= 3/);
  assert.match(data, /helpfulReceived >= 3/);
  assert.match(data, /helpfulPeople >= 2/);
  assert.match(data, /شارة مساهمة وليست توثيق هوية/);
});

test('reviews and replies both render like/helpful reactions with stable deep links', async () => {
  const [reviews, replies, reactionComponent] = await Promise.all([
    readProjectFile('components/member-reviews.tsx'),
    readProjectFile('components/review-thread.tsx'),
    readProjectFile('components/community-reactions.tsx'),
  ]);

  assert.match(reviews, /<CommunityReactions/);
  assert.match(reviews, /review-/);
  assert.match(replies, /<CommunityReactions/);
  assert.match(reactionComponent, /إعجاب/);
  assert.match(reactionComponent, /مفيد/);
  assert.match(reactionComponent, /aria-pressed/);
});

test('new replies create an owner-only notification without notifying self replies', async () => {
  const migration = await readProjectFile('supabase/migrations/20260918093000_community_v2_reactions_badges_notifications.sql');

  assert.match(migration, /community_review_reply/);
  assert.match(migration, /review_reply/);
  assert.match(migration, /parent_review\.user_id = new\.user_id/);
  assert.match(migration, /#review-/);
  assert.match(migration, /insert into public\.member_notifications/);
});
