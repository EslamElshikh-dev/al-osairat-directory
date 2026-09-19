import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Community V2.8 adds a private per-watch notification mute preference', async () => {
  const migration = await readProjectFile('supabase/migrations/20260919084500_community_v28_inbox_mute.sql');
  assert.match(migration, /notifications_muted boolean not null default false/);
  assert.match(migration, /grant update \(notifications_muted\)/);
  assert.match(migration, /coalesce\(w\.notifications_muted, false\) = false/);
  assert.match(migration, /revoke all on function private\.notify_review_reply/);
});

test('muted discussions keep watch state but suppress watcher notifications', async () => {
  const migration = await readProjectFile('supabase/migrations/20260919084500_community_v28_inbox_mute.sql');
  assert.match(migration, /from public\.community_thread_watches w/);
  assert.match(migration, /w\.review_id = parent_review\.id/);
  assert.match(migration, /notifications_muted/);
  assert.doesNotMatch(migration, /delete from public\.community_thread_watches/);
});

test('conversation inbox exposes mute state, first unread and unread totals', async () => {
  const route = await readProjectFile('app/api/community-library/route.ts');
  assert.match(route, /notificationsMuted/);
  assert.match(route, /firstUnreadReplyId/);
  assert.match(route, /firstUnreadHref/);
  assert.match(route, /watchedNewReplyCount/);
  assert.match(route, /newReplies\[0\]\?\.id/);
});

test('mute and unmute actions are same-origin authenticated watch updates', async () => {
  const route = await readProjectFile('app/api/community-library/route.ts');
  assert.match(route, /\['watch', 'unwatch', 'mark_seen', 'mute', 'unmute'\]/);
  assert.match(route, /notifications_muted: action === 'mute'/);
  assert.match(route, /sameOrigin/);
  assert.match(route, /user_id: 'eq\.' \+ session\.userId/);
});

test('bulk mark-all-seen advances every owned watch to its latest published reply', async () => {
  const route = await readProjectFile('app/api/community-library/route.ts');
  assert.match(route, /action === 'mark_all_seen'/);
  assert.match(route, /latestByReview/);
  assert.match(route, /Promise\.all\(watches\.map/);
  assert.match(route, /last_seen_reply_id: latest\?\.id/);
  assert.match(route, /status=eq\.published/);
});

test('conversation inbox UI supports unread-only, mark-all and per-thread mute', async () => {
  const panel = await readProjectFile('components/auth/community-library-panel.tsx');
  assert.match(panel, /غير المقروء فقط/);
  assert.match(panel, /اعتبار الكل مقروء/);
  assert.match(panel, /اذهب لأول رد جديد/);
  assert.match(panel, /item\.notificationsMuted \? 'unmute' : 'mute'/);
  assert.match(panel, /🔕 مكتوم/);
});
