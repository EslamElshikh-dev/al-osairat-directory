import assert from 'node:assert/strict';
import test from 'node:test';
import { ahaywaGharbScan20260913 } from '../lib/data/ahaywa-gharb-scan-2026-09-13.ts';

test('the September 13 Al-Ahaywa Gharb scan contains distinct verified village records', () => {
  assert.equal(ahaywaGharbScan20260913.length, 30);
  assert.equal(new Set(ahaywaGharbScan20260913.map((listing) => listing.id)).size, 30);
  assert.equal(new Set(ahaywaGharbScan20260913.map((listing) => listing.slug)).size, 30);

  for (const listing of ahaywaGharbScan20260913) {
    assert.equal(listing.village, 'الأحايوة غرب');
    assert.equal(listing.source, 'google_maps');
    assert.ok(['google_verified', 'cross_checked'].includes(listing.sourceStatus));
    assert.match(listing.googleMapsUrl, /^https:\/\/www\.google\.com\/maps\/search\/\?/);
    assert.equal(listing.lastUpdatedAt, '2026-09-13');
  }
});

test('the Al-Ahaywa Gharb scan covers services, commerce, worship, diwans and localities', () => {
  const categories = ahaywaGharbScan20260913.reduce((counts, listing) => {
    counts[listing.category] = (counts[listing.category] ?? 0) + 1;
    return counts;
  }, {});

  assert.deepEqual(categories, {
    pharmacies: 1,
    education: 3,
    worship: 6,
    shops: 6,
    restaurants: 3,
    transport: 1,
    government: 3,
    community: 6,
    crafts: 1,
  });

  assert.deepEqual(
    new Set(ahaywaGharbScan20260913.map((listing) => listing.locality).filter(Boolean)),
    new Set(['عسر البحري', 'نوار', 'القاضي', 'الجزيرة المستجدة']),
  );
  assert.equal(
    ahaywaGharbScan20260913.find((listing) => listing.id === 'government-مكتب-بريد-الاحايوة-غرب')?.phone,
    '0932440127',
  );
  assert.equal(
    ahaywaGharbScan20260913.find((listing) => listing.id === 'pharmacies-صيدلية-الدكتورة-ازهار-قناوي-الاحايوة-غرب')?.googleMapsPlusCode,
    'CRJ5+QP',
  );
});
