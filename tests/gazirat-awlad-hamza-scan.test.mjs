import assert from 'node:assert/strict';
import test from 'node:test';
import { gaziratAwladHamzaScan20260913 } from '../lib/data/gazirat-awlad-hamza-scan-2026-09-13.ts';

test('the September 13 Gazirat Awlad Hamza scan contains verified village venues only', () => {
  assert.equal(gaziratAwladHamzaScan20260913.length, 12);
  assert.equal(
    new Set(gaziratAwladHamzaScan20260913.map((listing) => listing.id)).size,
    gaziratAwladHamzaScan20260913.length,
  );
  assert.equal(
    new Set(gaziratAwladHamzaScan20260913.map((listing) => listing.slug)).size,
    gaziratAwladHamzaScan20260913.length,
  );
  assert.equal(
    new Set(gaziratAwladHamzaScan20260913.map((listing) => listing.googlePlaceId)).size,
    gaziratAwladHamzaScan20260913.length,
  );

  for (const listing of gaziratAwladHamzaScan20260913) {
    assert.equal(listing.village, 'جزيرة أولاد حمزة');
    assert.equal(listing.source, 'google_maps');
    assert.ok(['google_verified', 'cross_checked'].includes(listing.sourceStatus));
    assert.match(listing.googlePlaceId, /^ChIJ/);
    assert.match(listing.googleMapsUrl, /query_place_id=/);
    assert.equal(listing.lastUpdatedAt, '2026-09-13');
  }
});
