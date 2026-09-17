import assert from 'node:assert/strict';
import test from 'node:test';
import { masaeedSchoolsFollowup20260918 } from '../lib/data/masaeed-schools-followup-2026-09-18.ts';

test('Masaeed school follow-up adds two cross-checked schools', () => {
  assert.equal(masaeedSchoolsFollowup20260918.length, 2);
  assert.equal(new Set(masaeedSchoolsFollowup20260918.map((x) => x.id)).size, 2);
  assert.ok(masaeedSchoolsFollowup20260918.every((x) => x.village === 'المساعيد'));
  assert.ok(masaeedSchoolsFollowup20260918.every((x) => x.category === 'education'));
  assert.ok(masaeedSchoolsFollowup20260918.every((x) => x.sourceStatus === 'cross_checked'));
  assert.ok(masaeedSchoolsFollowup20260918.every((x) => x.lastUpdatedAt === '2026-09-18'));
});
