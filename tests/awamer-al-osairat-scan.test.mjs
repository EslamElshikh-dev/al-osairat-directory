import assert from 'node:assert/strict';
import test from 'node:test';
import { awamerAlOsairatScan20260916 } from '../lib/data/awamer-al-osairat-scan-2026-09-16.ts';

test('the September 16 Awamer scan is village-scoped and duplicate-safe', () => {
  assert.equal(awamerAlOsairatScan20260916.length, 5);
  assert.equal(new Set(awamerAlOsairatScan20260916.map((listing) => listing.id)).size, 5);
  assert.equal(new Set(awamerAlOsairatScan20260916.map((listing) => listing.slug)).size, 5);

  for (const listing of awamerAlOsairatScan20260916) {
    assert.equal(listing.village, 'عوامر العسيرات');
    assert.equal(listing.lastUpdatedAt, '2026-09-16');
  }

  assert.equal(
    awamerAlOsairatScan20260916.some((listing) => listing.title === 'مكتب بريد عوامر العسيرات'),
    false,
  );
});

test('the Awamer scan covers education, worship, health and local trade', () => {
  const categories = awamerAlOsairatScan20260916.reduce((counts, listing) => {
    counts[listing.category] = (counts[listing.category] ?? 0) + 1;
    return counts;
  }, {});

  assert.deepEqual(categories, {
    education: 2,
    worship: 1,
    government: 1,
    shops: 1,
  });

  assert.equal(
    awamerAlOsairatScan20260916.find((listing) => listing.id === 'government-الوحدة-الصحية-بعوامر-العسيرات')?.phone,
    '0934938127',
  );
  assert.equal(
    awamerAlOsairatScan20260916.find((listing) => listing.id === 'shops-معرض-النور-للادوات-الصحية-عوامر-العسيرات')?.phone,
    '01154987198',
  );
});
