import assert from 'node:assert/strict';
import test from 'node:test';
import { awqafMosqueGaps20260918 } from '../lib/data/awqaf-mosque-gaps-2026-09-18.ts';

test('Awqaf mosque gap batch is duplicate-safe and village-scoped', () => {
  assert.equal(awqafMosqueGaps20260918.length, 6);
  assert.equal(new Set(awqafMosqueGaps20260918.map((x) => x.id)).size, 6);
  assert.equal(new Set(awqafMosqueGaps20260918.map((x) => x.slug)).size, 6);
  assert.ok(awqafMosqueGaps20260918.every((x) => x.category === 'worship'));
  assert.ok(awqafMosqueGaps20260918.every((x) => x.sourceStatus === 'cross_checked'));
  assert.equal(awqafMosqueGaps20260918.filter((x) => x.village === 'أولاد جبارة').length, 3);
  assert.equal(awqafMosqueGaps20260918.filter((x) => x.village === 'المساعيد').length, 3);
  assert.ok(awqafMosqueGaps20260918.filter((x) => x.locality === 'عباس').every((x) => x.village === 'أولاد جبارة'));
});
