import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('V2.9 scopes heavy account and member CSS away from the root layout', async () => {
  const root = await readProjectFile('app/layout.tsx');
  const account = await readProjectFile('app/account/layout.tsx');
  const members = await readProjectFile('app/members/layout.tsx');
  assert.doesNotMatch(root, /'\.\/auth\.css'/);
  assert.doesNotMatch(root, /'\.\/account-upgrade\.css'/);
  assert.doesNotMatch(root, /'\.\/notifications\.css'/);
  assert.doesNotMatch(root, /'\.\/community-profiles\.css'/);
  assert.doesNotMatch(root, /'\.\/community-v28\.css'/);
  assert.match(root, /'\.\/account-trigger\.css'/);
  assert.match(root, /'\.\/notification-bell\.css'/);
  assert.match(account, /'\.\.\/auth\.css'/);
  assert.match(account, /'\.\.\/community-v28\.css'/);
  assert.match(members, /'\.\.\/community-profiles\.css'/);
});

test('V2.9 hardens OAuth callback robots metadata', async () => {
  const layout = await readProjectFile('app/account/oauth-callback/layout.tsx');
  assert.match(layout, /index: false/);
  assert.match(layout, /follow: false/);
  assert.match(layout, /noarchive: true/);
  assert.match(layout, /nocache: true/);
  assert.match(layout, /nosnippet: true/);
});

test('V2.9 uses next image for Google-backed member avatars', async () => {
  const config = await readProjectFile('next.config.ts');
  const member = await readProjectFile('app/members/[slug]/page.tsx');
  const accountButton = await readProjectFile('components/auth/account-button.tsx');
  assert.match(config, /hostname: 'lh3\.googleusercontent\.com'/);
  assert.match(member, /import Image from 'next\/image'/);
  assert.match(member, /width=\{118\}/);
  assert.match(accountButton, /import Image from 'next\/image'/);
  assert.match(accountButton, /width=\{31\}/);
});

test('V2.9 sitemap uses lightweight cached public member slugs', async () => {
  const profiles = await readProjectFile('lib/community-profiles.ts');
  const sitemap = await readProjectFile('app/sitemap.ts');
  assert.match(profiles, /getPublicMemberSlugsForSitemap/);
  assert.match(profiles, /next: \{ revalidate: 300 \}/);
  assert.match(sitemap, /getPublicMemberSlugsForSitemap/);
  assert.doesNotMatch(sitemap, /getPublicMembers\(\)/);
});

test('V2.9 emits structured Supabase fetch diagnostics without query strings', async () => {
  const helper = await readProjectFile('lib/supabase-public-fetch.ts');
  assert.match(helper, /\[supabase-public-fetch\]/);
  assert.match(helper, /kind: controller\.signal\.aborted \? 'timeout' : 'network_error'/);
  assert.match(helper, /parsed\.pathname/);
  assert.doesNotMatch(helper, /parsed\.search/);
});

test('V2.9 stops prefetch and crawl expansion for transport filter combinations', async () => {
  const explorer = await readProjectFile('components/directory-explorer.tsx');
  const category = await readProjectFile('app/directory/[category]/page.tsx');
  assert.ok((explorer.match(/prefetch=\{false\}/g) || []).length >= 2);
  assert.ok((explorer.match(/rel="nofollow"/g) || []).length >= 2);
  assert.match(category, /if \(transportFilterActive\)/);
  assert.match(category, /follow: false/);
});
