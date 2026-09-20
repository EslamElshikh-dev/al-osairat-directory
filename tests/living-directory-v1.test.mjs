import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('listing reviews are allowed in the tracked Supabase migration', () => {
  const sql = read('supabase/migrations/20260920021757_living_directory_listing_reviews.sql');
  assert.match(sql, /'listing'::text/);
  assert.match(sql, /content_reviews_target_type_check/);
  assert.match(sql, /content_reviews_target_key_check/);
});

test('content review API validates real listing targets', () => {
  const api = read('app/api/content-reviews/route.ts');
  assert.match(api, /ReviewTargetType = 'site' \| 'article' \| 'listing'/);
  assert.match(api, /getPublicDirectoryListings/);
  assert.match(api, /listingTargetExists/);
  assert.match(api, /await parseBodyTarget/);
});

test('member reviews can render on a listing', () => {
  const reviews = read('components/member-reviews.tsx');
  const listing = read('app/listing/[slug]/page.tsx');
  assert.match(reviews, /'site' \| 'article' \| 'listing'/);
  assert.match(listing, /targetType="listing"/);
  assert.match(listing, /listing-community-reviews/);
  assert.match(listing, /living-timeline/);
  assert.match(listing, /living-status-strip/);
  assert.match(listing, /living-related-card__reasons/);
});

test('listing journey links place activity community and Sand', () => {
  const listing = read('app/listing/[slug]/page.tsx');
  const sand = read('components/sand-assistant.tsx');
  assert.match(listing, /living-journey/);
  assert.match(listing, /href="\/community"/);
  assert.match(listing, /SandContextLink/);
  assert.match(sand, /sand:context/);
});

test('village pages expose real freshness pulse and recent reviewed records', () => {
  const village = read('app/villages/[slug]/page.tsx');
  assert.match(village, /village-living-pulse/);
  assert.match(village, /sortListingsByFreshness/);
  assert.match(village, /village-recent-activity/);
  assert.match(village, /village-living-journey/);
  assert.match(village, /SandContextLink/);
});

test('community and public member profiles resolve listing review context', () => {
  const activity = read('lib/community-activity.ts');
  const profiles = read('lib/community-profiles.ts');
  const memberPage = read('app/members/[slug]/page.tsx');
  assert.match(activity, /target_type: 'site' \| 'article' \| 'listing'/);
  assert.match(activity, /\/listing\//);
  assert.match(profiles, /targetType: 'site' \| 'article' \| 'listing'/);
  assert.match(profiles, /getPublicDirectoryListings/);
  assert.match(memberPage, /تقييم لنشاط/);
  assert.match(memberPage, /رد على تقييم لنشاط/);
});

test('Living Directory CSS is loaded after VNext layers', () => {
  const layout = read('app/layout.tsx');
  const css = read('app/living-directory.css');
  assert.ok(layout.indexOf("visual-vnext2.css") < layout.indexOf("living-directory.css"));
  assert.match(css, /member-reviews--listing/);
  assert.match(css, /village-living-pulse/);
  assert.match(css, /prefers-reduced-motion/);
});
