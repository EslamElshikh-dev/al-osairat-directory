import assert from 'node:assert/strict';
import test from 'node:test';
import { masaeedNagAlAbitMosque20260918 } from '../lib/data/masaeed-nag-al-abit-mosque-2026-09-18.ts';

test('Nag Al-Abit mosque is scoped to Masaeed and cross-checked', () => {
  assert.equal(masaeedNagAlAbitMosque20260918.length, 1);
  const listing = masaeedNagAlAbitMosque20260918[0];
  assert.equal(listing.id, 'worship-مسجد-نجع-العبيط-المساعيد');
  assert.equal(listing.village, 'المساعيد');
  assert.equal(listing.locality, 'نجوع العبيط');
  assert.equal(listing.category, 'worship');
  assert.equal(listing.sourceStatus, 'cross_checked');
  assert.equal(listing.googleMapsPlusCode, '9R45+4C5');
  assert.equal(listing.lastUpdatedAt, '2026-09-18');
});
