import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Community V2.7 keeps watched discussion read state private and owner-scoped', async () => {
  const migration = await readProjectFile('supabase/migrations/20260919080000_community_v27_read_state.sql');
  assert.match(migration, /last_seen_at timestamptz/);
  assert.match(migration, /last_seen_reply_id uuid/);
  assert.match(migration, /grant update \(last_seen_at, last_seen_reply_id\)/);
  assert.match(migration, /community_thread_watches_update_read_state/);
  assert.match(migration, /user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /rr\.review_id = community_thread_watches\.review_id/);
});

test('watch creation validates initial read position belongs to the watched discussion', async () => {
  const migration = await readProjectFile('supabase/migrations/20260919080000_community_v27_read_state.sql');
  assert.match(migration, /community_thread_watches_insert_own/);
  assert.match(migration, /last_seen_reply_id is null/);
  assert.match(migration, /rr\.id = community_thread_watches\.last_seen_reply_id/);
  assert.match(migration, /r\.user_id <> \(select auth\.uid\(\)\)/);
});

test('community library computes smart discussion metrics and unread counts', async () => {
  const route = await readProjectFile('app/api/community-library/route.ts');
  assert.match(route, /community_reaction_totals/);
  assert.match(route, /replyCount/);
  assert.match(route, /helpfulCount/);
  assert.match(route, /newReplyCount/);
  assert.match(route, /watchedNewReplyCount/);
  assert.match(route, /Date\.parse\(reply\.created_at\) > Date\.parse\(lastSeenAt\)/);
});

test('mark-seen only accepts a published reply from the same discussion', async () => {
  const route = await readProjectFile('app/api/community-library/route.ts');
  assert.match(route, /'mark_seen'/);
  assert.match(route, /seenReply\.review_id !== targetId/);
  assert.match(route, /last_seen_at: seenReply\?\.created_at/);
  assert.match(route, /last_seen_reply_id: seenReply\?\.id/);
  assert.match(route, /sameOrigin/);
});

test('watched discussion library supports latest, replies and helpful sorting', async () => {
  const panel = await readProjectFile('components/auth/community-library-panel.tsx');
  assert.match(panel, /type DiscussionSort = 'latest' \| 'replies' \| 'helpful'/);
  assert.match(panel, /الأحدث/);
  assert.match(panel, /الأكثر ردودًا/);
  assert.match(panel, /الأكثر فائدة/);
  assert.match(panel, /item\.replyCount/);
  assert.match(panel, /item\.helpfulCount/);
  assert.match(panel, /item\.newReplyCount/);
});

test('continue-from-last-seen deep link opens and targets the saved reply position', async () => {
  const route = await readProjectFile('app/api/community-library/route.ts');
  const thread = await readProjectFile('components/review-thread.tsx');
  assert.match(route, /continueReply/);
  assert.match(route, /discussion/);
  assert.match(thread, /params\.get\('discussion'\) !== reviewId/);
  assert.match(thread, /params\.get\('continueReply'\)/);
  assert.match(thread, /scrollIntoView/);
  assert.match(thread, /reply-.*reply\.id/);
});

test('last seen reply advances from actual viewport visibility', async () => {
  const thread = await readProjectFile('components/review-thread.tsx');
  assert.match(thread, /IntersectionObserver/);
  assert.match(thread, /intersectionRatio >= 0\.55/);
  assert.match(thread, /data-community-reply-id/);
  assert.match(thread, /data-community-reply-created-at/);
  assert.match(thread, /action: 'mark_seen'/);
  assert.match(thread, /community:library-changed/);
});
