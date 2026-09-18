import assert from 'node:assert/strict';
import test from 'node:test';
import { awladGabaraAlSiddiqMosque20260918 } from '../lib/data/awlad-gabara-al-siddiq-mosque-2026-09-18.ts';

test('Awlad Gabara Al-Siddiq mosque is Google-verified and duplicate-safe', () => {
  assert.equal(awladGabaraAlSiddiqMosque20260918.length, 1);
  const listing = awladGabaraAlSiddiqMosque20260918[0];
  assert.equal(listing.village, 'أولاد جبارة');
  assert.equal(listing.sourceStatus, 'google_verified');
  assert.equal(listing.googlePlaceId, 'ChIJj9PWCixRTxQRNgixgyryoow');
  assert.equal(listing.lastUpdatedAt, '2026-09-18');
});
