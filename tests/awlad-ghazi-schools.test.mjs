import assert from 'node:assert/strict';
import test from 'node:test';
import { awladGhaziSchools20260918 } from '../lib/data/awlad-ghazi-schools-2026-09-18.ts';

test('Awlad Ghazi school batch is duplicate-safe and locality-scoped', () => {
  assert.equal(awladGhaziSchools20260918.length, 2);
  assert.equal(new Set(awladGhaziSchools20260918.map((x) => x.id)).size, 2);
  assert.equal(new Set(awladGhaziSchools20260918.map((x) => x.slug)).size, 2);
  assert.ok(awladGhaziSchools20260918.every((x) => x.village === 'أولاد بهيج'));
  assert.ok(awladGhaziSchools20260918.every((x) => x.locality === 'أولاد غازي'));
  assert.ok(awladGhaziSchools20260918.every((x) => x.category === 'education'));
  assert.ok(awladGhaziSchools20260918.every((x) => x.sourceStatus === 'cross_checked'));
  assert.ok(awladGhaziSchools20260918.every((x) => x.lastUpdatedAt === '2026-09-18'));
});
