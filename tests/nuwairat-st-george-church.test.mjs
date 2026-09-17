import assert from 'node:assert/strict';
import test from 'node:test';
import { nuwairatStGeorgeChurch20260918 } from '../lib/data/nuwairat-st-george-church-2026-09-18.ts';

test('Nuwairat St George church is cross-checked and village-scoped', () => {
  assert.equal(nuwairatStGeorgeChurch20260918.length, 1);
  const listing = nuwairatStGeorgeChurch20260918[0];
  assert.equal(listing.id, 'worship-كنيسة-الشهيد-العظيم-مارجرجس-النويرات');
  assert.equal(listing.village, 'النويرات');
  assert.equal(listing.category, 'worship');
  assert.equal(listing.sourceStatus, 'cross_checked');
  assert.equal(listing.lastUpdatedAt, '2026-09-18');
});
