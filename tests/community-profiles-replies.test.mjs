import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('community profile migration exposes only a dedicated safe public projection', async () => {
  const migration = await readProjectFile('supabase/migrations/20260918084500_community_profiles_review_replies.sql');

  assert.match(migration, /create table if not exists public\.member_public_profiles/);
  assert.match(migration, /is_public boolean not null default false/);
  assert.match(migration, /show_location boolean not null default false/);
  assert.match(migration, /revoke all on table public\.member_public_profiles from anon, authenticated/);
  assert.match(migration, /grant select on table public\.member_public_profiles to anon, authenticated/);
  assert.match(migration, /grant update \(bio, is_public, show_location\)/);
  assert.doesNotMatch(migration, /\n\s*email\s+(?:text|varchar|uuid|jsonb?)\b/i);
  assert.doesNotMatch(migration, /\n\s*phone\s+(?:text|varchar|uuid|jsonb?)\b/i);
});

test('review replies are owner-scoped by RLS and limited to published reviews', async () => {
  const migration = await readProjectFile('supabase/migrations/20260918084500_community_profiles_review_replies.sql');

  assert.match(migration, /create table if not exists public\.content_review_replies/);
  assert.match(migration, /unique \(review_id, user_id\)/);
  assert.match(migration, /user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /r\.status = 'published'/);
  assert.match(migration, /content_review_replies_delete_own/);
});

test('content review cards link public member profiles and lazy-load reply discussions', async () => {
  const [reviews, thread] = await Promise.all([
    readProjectFile('components/member-reviews.tsx'),
    readProjectFile('components/review-thread.tsx'),
  ]);

  assert.match(reviews, /profileSlug/);
  assert.match(reviews, /<ReviewThread/);
  assert.match(reviews, /ملف عام/);
  assert.match(reviews, /member-review-card__rating-score/);
  assert.match(thread, /\/api\/review-replies/);
  assert.match(thread, /aria-expanded=\{open\}/);
  assert.match(thread, /if \(next\) await loadReplies\(\)/);
  assert.match(thread, /تسجيل الدخول/);
});

test('member account controls public profile visibility without exposing private account fields', async () => {
  const [route, form] = await Promise.all([
    readProjectFile('app/api/profile/route.ts'),
    readProjectFile('components/auth/member-profile-form.tsx'),
  ]);

  assert.match(route, /member_public_profiles/);
  assert.match(route, /is_public: isPublic/);
  assert.match(route, /show_location: showLocation/);
  assert.match(form, /تفعيل صفحتي العامة/);
  assert.match(form, /إظهار القرية والنجع/);
  assert.match(form, /لن يظهر بريدك الإلكتروني أو رقم جوالك/);
});

test('public member page only resolves explicitly public profiles', async () => {
  const [page, data] = await Promise.all([
    readProjectFile('app/members/[slug]/page.tsx'),
    readProjectFile('lib/community-profiles.ts'),
  ]);

  assert.match(page, /getPublicMemberProfileBySlug/);
  assert.match(page, /ProfilePage/);
  assert.match(data, /is_public: 'eq\.true'/);
  assert.match(data, /showLocation: Boolean\(row\.show_location\)/);
});
