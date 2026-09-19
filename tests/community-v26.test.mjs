import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Community V2.6 saved contributions are private and owner-scoped', async () => {
  const migration = await readProjectFile('supabase/migrations/20260919071000_community_v26_save_watch.sql');

  assert.match(migration, /create table if not exists public\.community_saved_contributions/);
  assert.match(migration, /revoke all on table public\.community_saved_contributions from anon, authenticated/);
  assert.match(migration, /grant select, insert, delete on table public\.community_saved_contributions to authenticated/);
  assert.match(migration, /community_saved_contributions_read_own/);
  assert.match(migration, /user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /status = 'published'/);
});

test('Community V2.6 watched discussions are private and exclude own reviews', async () => {
  const migration = await readProjectFile('supabase/migrations/20260919071000_community_v26_save_watch.sql');

  assert.match(migration, /create table if not exists public\.community_thread_watches/);
  assert.match(migration, /community_thread_watches_read_own/);
  assert.match(migration, /community_thread_watches_insert_own/);
  assert.match(migration, /r\.user_id <> \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(migration, /grant select on table public\.community_thread_watches to anon/);
});

test('watched discussion notifications are grouped and avoid duplicate author alerts', async () => {
  const migration = await readProjectFile('supabase/migrations/20260919071000_community_v26_save_watch.sql');

  assert.match(migration, /community_thread_update/);
  assert.match(migration, /community_watch/);
  assert.match(migration, /w\.user_id <> parent_review\.user_id/);
  assert.match(migration, /w\.user_id <> new\.user_id/);
  assert.match(migration, /n\.last_event_at >= now\(\) - interval '6 hours'/);
  assert.match(migration, /read_at = null/);
  assert.match(migration, /وصلت ' \|\| next_count::text \|\| ' ردود جديدة في نقاش تتابعه/);
});

test('community library API enforces same-origin writes and verified members', async () => {
  const route = await readProjectFile('app/api/community-library/route.ts');

  assert.match(route, /sameOrigin/);
  assert.match(route, /أكد بريدك الإلكتروني أولًا/);
  assert.match(route, /\['save', 'unsave', 'watch', 'unwatch'\]/);
  assert.match(route, /أنت صاحب التقييم وستصلك الردود تلقائيًا/);
  assert.match(route, /status=eq\.published/);
});

test('save and watch controls are embedded with existing community reactions', async () => {
  const reactions = await readProjectFile('components/community-reactions.tsx');
  const actions = await readProjectFile('components/community-library-actions.tsx');

  assert.match(reactions, /<CommunityLibraryActions/);
  assert.match(actions, /محفوظ/);
  assert.match(actions, /متابعة النقاش/);
  assert.match(actions, /community:library-changed/);
  assert.match(actions, /router\.push\('\/account\/login'\)/);
});

test('member account exposes private saved and watched library', async () => {
  const account = await readProjectFile('components/auth/account-panel.tsx');
  const page = await readProjectFile('app/account/page.tsx');
  const panel = await readProjectFile('components/auth/community-library-panel.tsx');

  assert.match(account, /<CommunityLibraryPanel/);
  assert.match(account, /href="#community-library"/);
  assert.match(page, /href="#community-library"/);
  assert.match(panel, /محفوظات المجتمع/);
  assert.match(panel, /نقاشات أتابعها/);
  assert.match(panel, /community:library-changed/);
});

test('watched discussion notifications have dedicated visual treatment', async () => {
  const bell = await readProjectFile('components/auth/notification-bell.tsx');
  const center = await readProjectFile('components/auth/notification-center.tsx');
  const styles = await readProjectFile('app/community-v26.css');

  assert.match(bell, /thread_update/);
  assert.match(center, /thread_update/);
  assert.match(styles, /type-community_thread_update/);
});
