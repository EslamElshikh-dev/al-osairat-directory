import assert from 'node:assert/strict';
import test from 'node:test';
import { nuwairatFollowupScan20260916 } from '../lib/data/nuwairat-followup-scan-2026-09-16.ts';
import { awladHamzaFollowupScan20260916 } from '../lib/data/awlad-hamza-followup-scan-2026-09-16.ts';

function assertUnique(scan) {
  assert.equal(new Set(scan.map((x) => x.id)).size, scan.length);
  assert.equal(new Set(scan.map((x) => x.slug)).size, scan.length);
  assert.ok(scan.every((x) => x.lastUpdatedAt === '2026-09-16'));
}

test('Nuwairat follow-up adds five duplicate-safe current records', () => {
  assert.equal(nuwairatFollowupScan20260916.length, 5);
  assertUnique(nuwairatFollowupScan20260916);
  assert.ok(nuwairatFollowupScan20260916.every((x) => x.village === 'النويرات'));
  assert.ok(nuwairatFollowupScan20260916.some((x) => x.title === 'مدرسة النويرات الإعدادية'));
  assert.ok(nuwairatFollowupScan20260916.some((x) => x.title === 'مقهى النويرات' && x.googlePlaceId));
});

test('Awlad Hamza follow-up adds eight duplicate-safe service records', () => {
  assert.equal(awladHamzaFollowupScan20260916.length, 8);
  assertUnique(awladHamzaFollowupScan20260916);
  assert.ok(awladHamzaFollowupScan20260916.every((x) => x.village === 'أولاد حمزة'));
  assert.ok(awladHamzaFollowupScan20260916.some((x) => x.title === 'البنك الزراعي المصري - أولاد حمزة' && x.phone === '0934937370'));
  assert.ok(awladHamzaFollowupScan20260916.some((x) => x.title === 'مخبز وحلواني أحباب الرسول' && x.sourceStatus === 'cross_checked'));
});

test('follow-up scans do not reuse IDs or slugs across villages', () => {
  const all = [...nuwairatFollowupScan20260916, ...awladHamzaFollowupScan20260916];
  assert.equal(new Set(all.map((x) => x.id)).size, all.length);
  assert.equal(new Set(all.map((x) => x.slug)).size, all.length);
});
