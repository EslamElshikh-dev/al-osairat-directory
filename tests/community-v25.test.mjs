import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Community V2.5 following feed state is private and owner-scoped', async () => {
  const migration = await readProjectFile('supabase/migrations/20260919063500_community_v25_feed_state.sql');

  assert.match(migration, /create table if not exists public\.community_feed_state/);
  assert.match(migration, /revoke all on table public\.community_feed_state from anon, authenticated/);
  assert.match(migration, /grant select, insert, update on table public\.community_feed_state to authenticated/);
  assert.match(migration, /community_feed_state_read_own/);
  assert.match(migration, /community_feed_state_insert_own/);
  assert.match(migration, /community_feed_state_update_own/);
  assert.match(migration, /user_id = \(select auth\.uid\(\)\)/);
});

test('following feed exposes new count and mark-seen without public tracking', async () => {
  const route = await readProjectFile('app/api/community-following-feed/route.ts');

  assert.match(route, /community_feed_state/);
  assert.match(route, /newCount/);
  assert.match(route, /lastSeenAt/);
  assert.match(route, /body\.action !== 'mark_seen'/);
  assert.match(route, /sameOrigin/);
  assert.match(route, /on_conflict=user_id/);
});

test('smart member suggestions exclude self and already-followed users', async () => {
  const route = await readProjectFile('app/api/community-following-feed/route.ts');
  const profiles = await readProjectFile('lib/community-profiles.ts');

  assert.match(route, /getSuggestedPublicMembers\(\[session\.userId, \.\.\.followedUserIds\], 4\)/);
  assert.match(profiles, /const excluded = new Set\(excludeUserIds\.filter\(Boolean\)\)/);
  assert.match(profiles, /!excluded\.has\(row\.user_id\)/);
  assert.match(profiles, /helpfulReceived/);
  assert.match(profiles, /contributionCount/);
});

test('follow changes broadcast so personalized discovery refreshes immediately', async () => {
  const button = await readProjectFile('components/community-follow-button.tsx');
  const panel = await readProjectFile('components/auth/following-feed-panel.tsx');

  assert.match(button, /community:follow-changed/);
  assert.match(panel, /addEventListener\('community:follow-changed'/);
  assert.match(panel, /MemberSuggestion/);
  assert.match(panel, /اعتبار الكل شوهد/);
});

test('weekly pulse uses public published activity and safe daily helpful aggregates', async () => {
  const activity = await readProjectFile('lib/community-activity.ts');
  const page = await readProjectFile('app/community/page.tsx');

  assert.match(activity, /getCommunityWeeklyPulse/);
  assert.match(activity, /community_reaction_daily_totals/);
  assert.match(activity, /status: 'eq\.published'/);
  assert.match(activity, /readVisibleProfiles/);
  assert.match(page, /نبض هذا الأسبوع/);
  assert.match(page, /الأكثر فائدة هذا الأسبوع/);
  assert.match(page, /لا نعرض نشاط الحسابات الخاصة|الصفحات العامة فقط/);
});

test('weekly pulse keeps Egypt-local week boundaries', async () => {
  const activity = await readProjectFile('lib/community-activity.ts');

  assert.match(activity, /timeZone: 'Africa\/Cairo'/);
  assert.match(activity, /sevenDayStartLocal/);
  assert.match(activity, /cairoDate/);
});
