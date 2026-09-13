import assert from 'node:assert/strict';
import test from 'node:test';
import { rashaidaScan20260913 } from '../lib/data/rashaida-scan-2026-09-13.ts';

test('the September 13 Rashaida scan contains distinct verified village records', () => {
  assert.equal(rashaidaScan20260913.length, 10);
  assert.equal(new Set(rashaidaScan20260913.map((listing) => listing.id)).size, 10);
  assert.equal(new Set(rashaidaScan20260913.map((listing) => listing.slug)).size, 10);

  for (const listing of rashaidaScan20260913) {
    assert.equal(listing.village, 'الرشايدة');
    assert.equal(listing.source, 'google_maps');
    assert.ok(['google_verified', 'cross_checked'].includes(listing.sourceStatus));
    assert.match(listing.googleMapsUrl, /^https:\/\/www\.google\.com\/maps\/search\/\?/);
    assert.equal(listing.lastUpdatedAt, '2026-09-13');
  }
});

test('the Rashaida follow-up adds the confirmed pharmacy, mobile services and diwans', () => {
  const categories = rashaidaScan20260913.reduce((counts, listing) => {
    counts[listing.category] = (counts[listing.category] ?? 0) + 1;
    return counts;
  }, {});

  assert.deepEqual(categories, { pharmacies: 1, shops: 2, community: 7 });
  assert.equal(
    rashaidaScan20260913.find((listing) => listing.id === 'shops-محلات-عاصم-ابوشابون')?.phone,
    '01004040620',
  );
});
