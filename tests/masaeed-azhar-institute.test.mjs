import assert from 'node:assert/strict';
import test from 'node:test';
import { masaeedAzharInstitute20260918 } from '../lib/data/masaeed-azhar-institute-2026-09-18.ts';

test('Masaeed Azhar institute is scoped to Abu Hilali and cross-checked', () => {
  assert.equal(masaeedAzharInstitute20260918.length, 1);
  const listing = masaeedAzharInstitute20260918[0];
  assert.equal(listing.id, 'education-معهد-بنين-المساعيد-الاعدادي-الثانوي');
  assert.equal(listing.village, 'المساعيد');
  assert.equal(listing.locality, 'أبو هلالي');
  assert.equal(listing.category, 'education');
  assert.equal(listing.sourceStatus, 'cross_checked');
  assert.equal(listing.lastUpdatedAt, '2026-09-18');
});
