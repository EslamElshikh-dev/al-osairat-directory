import assert from 'node:assert/strict';
import test from 'node:test';
import { awamerHafaydaFollowup20260918 } from '../lib/data/awamer-hafayda-followup-2026-09-18.ts';

test('Awamer Hafayda follow-up adds one cross-checked worship record', () => {
  assert.equal(awamerHafaydaFollowup20260918.length, 1);
  const listing = awamerHafaydaFollowup20260918[0];
  assert.equal(listing.id, 'worship-مسجد-الحفايضة-عوامر-العسيرات');
  assert.equal(listing.village, 'عوامر العسيرات');
  assert.equal(listing.category, 'worship');
  assert.equal(listing.sourceStatus, 'cross_checked');
  assert.equal(listing.lastUpdatedAt, '2026-09-18');
});
