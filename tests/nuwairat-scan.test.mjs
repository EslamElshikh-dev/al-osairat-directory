import assert from 'node:assert/strict';
import test from 'node:test';
import { nuwairatScan20260913 } from '../lib/data/nuwairat-scan-2026-09-13.ts';

test('the September 13 Nuwairat scan contains distinct, village-scoped Maps records', () => {
  assert.equal(nuwairatScan20260913.length, 16);
  assert.equal(new Set(nuwairatScan20260913.map((listing) => listing.id)).size, 16);
  assert.equal(new Set(nuwairatScan20260913.map((listing) => listing.slug)).size, 16);

  for (const listing of nuwairatScan20260913) {
    assert.equal(listing.village, 'النويرات');
    assert.equal(listing.source, 'google_maps');
    assert.equal(listing.sourceStatus, 'google_verified');
    assert.match(listing.googleMapsUrl, /^https:\/\/www\.google\.com\/maps\/search\/\?/);
    assert.equal(listing.lastUpdatedAt, '2026-09-13');
  }
});

test('the Nuwairat scan covers health, education, trade, worship, services and diwans', () => {
  const categories = nuwairatScan20260913.reduce((counts, listing) => {
    counts[listing.category] = (counts[listing.category] ?? 0) + 1;
    return counts;
  }, {});

  assert.deepEqual(categories, {
    pharmacies: 1,
    government: 2,
    education: 1,
    worship: 5,
    shops: 2,
    restaurants: 1,
    community: 4,
  });
  assert.equal(
    nuwairatScan20260913.find((listing) => listing.id === 'pharmacies-صيدلية-د-ايهاب-حشمت-الظني-النويرات')?.phone,
    '01287117759',
  );
  assert.equal(
    nuwairatScan20260913.find((listing) => listing.id === 'community-الكرمة-للرحلات-النويرات')?.reviewCount,
    22,
  );
});
