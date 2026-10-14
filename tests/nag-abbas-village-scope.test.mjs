import assert from 'node:assert/strict';
import test from 'node:test';
import { require as tsxRequire } from 'tsx/cjs/api';
const { nagAbbasFollowupScan20260917 } = tsxRequire('../lib/data/nag-abbas-followup-scan-2026-09-17.ts', import.meta.url);

test('Nag Abbas records belong to Awlad Gabara', () => {
  const nagAbbas = nagAbbasFollowupScan20260917.filter((x) => x.locality === 'نجع عباس');
  assert.equal(nagAbbas.length, 4);
  assert.ok(nagAbbas.every((x) => x.village === 'أولاد جبارة'));
  assert.ok(nagAbbas.every((x) => x.village !== 'الرشايدة'));
});
