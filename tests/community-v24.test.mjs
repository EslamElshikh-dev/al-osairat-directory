import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Community V2.4 daily aggregates expose counts without reactor identity', async () => {
  const migration = await readProjectFile('supabase/migrations/20260918113000_community_v24_feed_progress_digests.sql');

  assert.match(migration, /create table if not exists public\.community_reaction_daily_totals/);
  assert.match(migration, /grant select on table public\.community_reaction_daily_totals to anon, authenticated/);
  assert.match(migration, /community_reaction_daily_totals_read_visible/);
  assert.match(migration, /helpful_count bigint/);
  assert.doesNotMatch(migration, /reactor_id|follower_id/);
});

test('weekly helpful ranking uses only recent safe daily aggregates', async () => {
  const source = await readProjectFile('lib/community-activity.ts');
  const feed = await readProjectFile('components/community-activity-feed.tsx');

  assert.match(source, /community_reaction_daily_totals/);
  assert.match(source, /setUTCDate\(value\.getUTCDate\(\) - 6\)/);
  assert.match(source, /weeklyHelpfulCount/);
  assert.match(feed, /الأكثر فائدة هذا الأسبوع/);
  assert.match(feed, /آخر 7 أيام/);
  assert.match(feed, /weeklyHelpfulCount > 0/);
});

test('following feed reads only the signed-in member own follow graph and public activity', async () => {
  const route = await readProjectFile('app/api/community-following-feed/route.ts');
  const activity = await readProjectFile('lib/community-activity.ts');

  assert.match(route, /community_member_follows/);
  assert.match(route, /follower_id: 'eq\.' \+ session\.userId/);
  assert.match(route, /getPublicCommunityActivityForUserIds/);
  assert.match(activity, /is_public: 'eq\.true'/);
  assert.match(activity, /status: 'eq\.published'/);
});

test('private members can read only their own progress while public stats remain visible for public profiles', async () => {
  const migration = await readProjectFile('supabase/migrations/20260918113000_community_v24_feed_progress_digests.sql');
  const route = await readProjectFile('app/api/community-progress/route.ts');

  assert.match(migration, /public_member_stats_read_visible_or_own/);
  assert.match(migration, /user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /p\.is_public = true/);
  assert.match(route, /public_member_stats/);
  assert.match(route, /content_reviews/);
  assert.match(route, /content_review_replies/);
});

test('badge progress mirrors Community V2 badge thresholds', async () => {
  const route = await readProjectFile('app/api/community-progress/route.ts');
  const panel = await readProjectFile('components/auth/community-progress-panel.tsx');

  assert.match(route, /contributionCount >= 3/);
  assert.match(route, /contributionCount >= 5 && helpfulReceived >= 3 && helpfulPeople >= 2/);
  assert.match(panel, /عضو نشط/);
  assert.match(panel, /مساهم موثوق/);
  assert.match(panel, /شارة جودة مساهمة وليست توثيق هوية/);
});

test('helpful notifications aggregate repeated events and throttle unread resurfacing', async () => {
  const migration = await readProjectFile('supabase/migrations/20260918113000_community_v24_feed_progress_digests.sql');
  const api = await readProjectFile('app/api/notifications/route.ts');
  const center = await readProjectFile('components/auth/notification-center.tsx');

  assert.match(migration, /event_count integer not null default 1/);
  assert.match(migration, /last_event_at timestamptz not null default now\(\)/);
  assert.match(migration, /v_existing\.last_event_at < now\(\) - interval '6 hours'/);
  assert.match(migration, /حصلت مساهمتك على/);
  assert.match(api, /event_count,last_event_at/);
  assert.match(center, /notification-item__group-count/);
});

test('multiple replies on the same review are grouped into one notification window', async () => {
  const migration = await readProjectFile('supabase/migrations/20260918114000_community_v241_reply_digest.sql');

  assert.match(migration, /n\.entity_id = parent_review\.id/);
  assert.match(migration, /n\.last_event_at >= now\(\) - interval '6 hours'/);
  assert.match(migration, /وصلت ' \|\| next_count::text \|\| ' ردود جديدة على تقييمك/);
  assert.match(migration, /event_count = next_count/);
});

test('member account exposes following feed and contribution progress sections', async () => {
  const panel = await readProjectFile('components/auth/account-panel.tsx');
  const page = await readProjectFile('app/account/page.tsx');

  assert.match(panel, /<FollowingFeedPanel/);
  assert.match(panel, /<CommunityProgressPanel/);
  assert.match(panel, /href="#following-feed"/);
  assert.match(panel, /href="#community-progress"/);
  assert.match(page, /href="#following-feed"/);
  assert.match(page, /href="#community-progress"/);
});
