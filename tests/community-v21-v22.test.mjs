import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Community V2.1 replaces exposed SECURITY DEFINER aggregates with safe public tables', async () => {
  const migration = await readProjectFile('supabase/migrations/20260918095500_community_v21_safe_aggregates.sql');
  const reactions = await readProjectFile('lib/community-reactions.ts');
  const profiles = await readProjectFile('lib/community-profiles.ts');

  assert.match(migration, /create table if not exists public\.community_reaction_totals/);
  assert.match(migration, /create table if not exists public\.public_member_stats/);
  assert.match(migration, /drop function if exists public\.get_community_reaction_counts/);
  assert.match(migration, /drop function if exists public\.get_public_member_stats/);
  assert.match(migration, /community_reaction_totals_read_public/);
  assert.match(migration, /public_member_stats_read_visible_profiles/);
  assert.match(reactions, /community_reaction_totals/);
  assert.doesNotMatch(reactions, /rpc\/get_community_reaction_counts/);
  assert.match(profiles, /public_member_stats/);
  assert.doesNotMatch(profiles, /rpc\/get_public_member_stats/);
});

test('Community V2.1 member explorer supports Arabic search, badge filters and meaningful sorting', async () => {
  const explorer = await readProjectFile('components/community-members-explorer.tsx');
  const page = await readProjectFile('app/members/page.tsx');

  assert.match(explorer, /replace\(\/\[إأآٱ\]\/g, 'ا'\)/);
  assert.match(explorer, /عضو نشط/);
  assert.match(explorer, /مساهم موثوق/);
  assert.match(explorer, /الأكثر فائدة/);
  assert.match(explorer, /الأكثر مساهمة/);
  assert.match(explorer, /الأحدث انضمامًا/);
  assert.match(page, /<CommunityMembersExplorer members=\{members\}/);
});

test('public member profiles include review and reply activity without exposing private account fields', async () => {
  const data = await readProjectFile('lib/community-profiles.ts');
  const page = await readProjectFile('app/members/[slug]/page.tsx');

  assert.match(data, /export type PublicMemberReply/);
  assert.match(data, /content_review_replies/);
  assert.match(data, /status: 'eq\.published'/);
  assert.match(page, /الردود المنشورة/);
  assert.match(page, /عرض المناقشة/);
  assert.doesNotMatch(page, /profile\.email|profile\.phone/);
});

test('Community V2.2 report table is owner-scoped, admin-reviewed and blocks self-reporting', async () => {
  const migration = await readProjectFile('supabase/migrations/20260918101500_community_v22_content_reports.sql');

  assert.match(migration, /create table if not exists public\.community_content_reports/);
  assert.match(migration, /community_content_reports_read_own/);
  assert.match(migration, /community_content_reports_insert_own/);
  assert.match(migration, /community_content_reports_admin_read/);
  assert.match(migration, /community_content_reports_admin_update/);
  assert.match(migration, /r\.user_id <> \(select auth\.uid\(\)\)/);
  assert.match(migration, /rr\.user_id <> \(select auth\.uid\(\)\)/);
  assert.match(migration, /community_content_reports_open_review_uidx/);
  assert.match(migration, /community_content_reports_open_reply_uidx/);
});

test('member report UI is wired into reactions and applies daily and duplicate protections', async () => {
  const reactions = await readProjectFile('components/community-reactions.tsx');
  const button = await readProjectFile('components/community-report-button.tsx');
  const route = await readProjectFile('app/api/community-reports/route.ts');

  assert.match(reactions, /<CommunityReportButton/);
  assert.match(button, /إبلاغ/);
  assert.match(button, /لن يظهر اسمك لصاحب التقييم أو الرد/);
  assert.match(route, /tooManyRecentReports/);
  assert.match(route, /hasOpenReport/);
  assert.match(route, /وصلت إلى الحد اليومي للبلاغات/);
  assert.match(route, /لا يمكن الإبلاغ عن مساهمتك أنت/);
});

test('admin moderation inbox can keep or hide reported content through protected admin routes', async () => {
  const page = await readProjectFile('app/admin/page.tsx');
  const component = await readProjectFile('components/admin/admin-community-reports.tsx');
  const route = await readProjectFile('app/api/admin/community-reports/route.ts');

  assert.match(page, /<AdminCommunityReports/);
  assert.match(page, /href="#community-reports"/);
  assert.match(component, /إخفاء المحتوى/);
  assert.match(component, /حسم وإبقاء المحتوى/);
  assert.match(component, /رفض البلاغ/);
  assert.match(route, /resolveAdminSession/);
  assert.match(route, /hideContent && status !== 'resolved'/);
  assert.match(route, /status: 'hidden'/);
});
