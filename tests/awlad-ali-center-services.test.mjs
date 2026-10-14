import assert from 'node:assert/strict';
import test from 'node:test';
import { require as tsxRequire } from 'tsx/cjs/api';
const { awladAliCenterServicesScan20260917 } = tsxRequire('../lib/data/awlad-ali-center-services-scan-2026-09-17.ts', import.meta.url);
const { listings } = tsxRequire('../lib/data/index.ts', import.meta.url);

test('Awlad Ali and Al Usayrat center batch is verified and duplicate-safe', () => {
  assert.equal(awladAliCenterServicesScan20260917.length, 3);
  assert.equal(new Set(awladAliCenterServicesScan20260917.map((item) => item.id)).size, 3);
  assert.equal(new Set(awladAliCenterServicesScan20260917.map((item) => item.slug)).size, 3);
  assert.ok(awladAliCenterServicesScan20260917.every((item) => item.village === 'أولاد حمزة'));
  assert.ok(awladAliCenterServicesScan20260917.every((item) => item.lastUpdatedAt === '2026-09-18'));

  const boys = awladAliCenterServicesScan20260917.find((item) => item.id === 'education-معهد-بنين-اولاد-علي-الازهري');
  const girls = awladAliCenterServicesScan20260917.find((item) => item.id === 'education-معهد-فتيات-اولاد-علي-الازهري');
  const council = awladAliCenterServicesScan20260917.find((item) => item.id === 'government-الوحدة-المحلية-لمركز-ومدينة-العسيرات');

  assert.equal(boys?.sourceStatus, 'cross_checked');
  assert.equal(girls?.sourceStatus, 'cross_checked');
  assert.equal(council?.sourceStatus, 'google_verified');
  assert.equal(council?.googlePlaceId, 'ChIJm70QWAVPTxQR4FNVKqDu800');
  assert.equal(council?.googleMapsPlusCode, '9RXC+74M');

  for (const item of awladAliCenterServicesScan20260917) {
    assert.equal(listings.filter((listing) => listing.id === item.id).length, 1, item.id);
    assert.equal(listings.filter((listing) => listing.slug === item.slug).length, 1, item.slug);
  }
});

test('the combined snapshot has unique IDs and slugs and retains the latest Nuwairat records', () => {
  assert.equal(new Set(listings.map((item) => item.id)).size, listings.length);
  assert.equal(new Set(listings.map((item) => item.slug)).size, listings.length);
  for (const id of ['shops-الراعي-للتجارة-النويرات', 'restaurants-مقهى-النويرات']) {
    const item = listings.find((listing) => listing.id === id);
    assert.equal(item?.lastUpdatedAt, '2026-09-16');
    assert.ok(item?.googlePlaceId);
  }
});
