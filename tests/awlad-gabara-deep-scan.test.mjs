import assert from 'node:assert/strict';
import test from 'node:test';
import { awladGabaraDeepScan20260918 } from '../lib/data/awlad-gabara-deep-scan-2026-09-18.ts';

test('Awlad Gabara deep scan adds two cross-checked records', () => {
  assert.equal(awladGabaraDeepScan20260918.length, 2);
  assert.equal(new Set(awladGabaraDeepScan20260918.map((x) => x.id)).size, 2);
  assert.equal(new Set(awladGabaraDeepScan20260918.map((x) => x.slug)).size, 2);
  assert.ok(awladGabaraDeepScan20260918.every((x) => x.village === 'أولاد جبارة'));
  assert.ok(awladGabaraDeepScan20260918.every((x) => x.sourceStatus === 'cross_checked'));
  assert.ok(awladGabaraDeepScan20260918.every((x) => x.lastUpdatedAt === '2026-09-18'));
  assert.ok(awladGabaraDeepScan20260918.some((x) => x.locality === 'أبو رجل'));
});
