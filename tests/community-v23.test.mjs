import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Community V2.3 keeps the follow graph private and exposes counts only', async () => {
  const migration = await readProjectFile('supabase/migrations/20260918111500_community_v23_following_helpful_notifications.sql');

  assert.match(migration, /create table if not exists public\.community_member_follows/);
  assert.match(migration, /revoke all on table public\.community_member_follows from anon, authenticated/);
  assert.match(migration, /grant select, insert, delete on table public\.community_member_follows to authenticated/);
  assert.match(migration, /community_member_follows_read_own/);
  assert.match(migration, /follower_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /create table if not exists public\.community_follow_totals/);
  assert.match(migration, /grant select on table public\.community_follow_totals to anon, authenticated/);
  assert.match(migration, /community_follow_totals_read_public/);
});

test('following blocks self-follow and private-profile targets', async () => {
  const migration = await readProjectFile('supabase/migrations/20260918111500_community_v23_following_helpful_notifications.sql');
  const route = await readProjectFile('app/api/community-follows/route.ts');

  assert.match(migration, /follower_id <> followed_user_id/);
  assert.match(migration, /p\.is_public = true/);
  assert.match(route, /لا يمكنك متابعة صفحتك أنت/);
  assert.match(route, /أكد بريدك الإلكتروني أولًا/);
  assert.match(route, /sameOrigin/);
});

test('public community feed includes only public-profile published activity', async () => {
  const source = await readProjectFile('lib/community-activity.ts');
  const page = await readProjectFile('app/community/page.tsx');

  assert.match(source, /is_public: 'eq\.true'/);
  assert.match(source, /status: 'eq\.published'/);
  assert.match(source, /content_reviews/);
  assert.match(source, /content_review_replies/);
  assert.match(source, /readCommunityReactionSummaries/);
  assert.match(page, /لا نعرض نشاط الحسابات الخاصة/);
  assert.match(page, /<CommunityActivityFeed items=\{items\}/);
});

test('helpful notification is anonymous and deduped per contribution', async () => {
  const migration = await readProjectFile('supabase/migrations/20260918111500_community_v23_following_helpful_notifications.sql');

  assert.match(migration, /community_helpful_received/);
  assert.match(migration, /وجد أحد أعضاء المجتمع أن مساهمتك مفيدة/);
  assert.match(migration, /if exists \(/i);
  assert.match(migration, /n\.entity_id = v_target_id/);
  assert.doesNotMatch(migration, /new\.user_id.*message|reactor.*message/i);
});

test('member profile exposes follower count and follow control without follower identities', async () => {
  const page = await readProjectFile('app/members/[slug]/page.tsx');
  const button = await readProjectFile('components/community-follow-button.tsx');
  const helper = await readProjectFile('lib/community-follows.ts');

  assert.match(page, /<CommunityFollowButton/);
  assert.match(page, /getPublicMemberFollowerCount/);
  assert.match(button, /\+ متابعة/);
  assert.match(button, /تتابعه/);
  assert.match(helper, /community_follow_totals/);
  assert.doesNotMatch(helper, /community_member_follows/);
});

test('Community V2.3 is discoverable through navigation and sitemap', async () => {
  const shell = await readProjectFile('components/site-shell.tsx');
  const sitemap = await readProjectFile('app/sitemap.ts');

  assert.match(shell, /href="\/community"/);
  assert.match(shell, /نبض المجتمع/);
  assert.match(sitemap, /absoluteUrl\('\/community'\)/);
});
