import test from 'node:test';
import assert from 'node:assert/strict';
import { queryDirectoryListings } from '../lib/directory-query.ts';
import { getRelatedListings, getUndercoveredVillages } from '../lib/discovery.ts';

function listing(overrides = {}) {
  return {
    id: 'base',
    slug: 'base',
    title: 'نشاط محلي',
    category: 'shops',
    location: 'العسيرات',
    village: 'أولاد حمزة',
    reviewCount: 0,
    source: 'user_collected',
    sourceStatus: 'cross_checked',
    ...overrides,
  };
}

test('general category intent can find listings even when the word is not in the title', () => {
  const transport = listing({
    id: 'transport-1',
    slug: 'transport-1',
    title: 'الحاج أحمد',
    category: 'transport',
    subCategory: 'سائق',
  });

  const result = queryDirectoryListings([transport], { query: 'مواصلات' });
  assert.equal(result.total, 1);
  assert.equal(result.items[0].id, 'transport-1');
});

test('related discovery prefers same-category and same-village options, then useful fallbacks', () => {
  const source = listing({ id: 'source', slug: 'source', category: 'doctors', subCategory: 'أسنان' });
  const sameVillageCategory = listing({
    id: 'best',
    slug: 'best',
    category: 'doctors',
    subCategory: 'أسنان',
    village: 'أولاد حمزة',
  });
  const sameCategoryOtherVillage = listing({
    id: 'fallback',
    slug: 'fallback',
    category: 'doctors',
    subCategory: 'أسنان',
    village: 'الرشايدة',
  });
  const unrelated = listing({ id: 'other', slug: 'other', category: 'shops', village: 'الرشايدة' });

  const related = getRelatedListings(source, [source, unrelated, sameCategoryOtherVillage, sameVillageCategory], 3);
  assert.deepEqual(related.map((item) => item.id), ['best', 'fallback']);
});

test('balanced village discovery prioritizes published villages with lower coverage', () => {
  const rows = [
    listing({ id: 'a1', slug: 'a1', village: 'أولاد حمزة', category: 'shops' }),
    listing({ id: 'a2', slug: 'a2', village: 'أولاد حمزة', category: 'doctors' }),
    listing({ id: 'r1', slug: 'r1', village: 'الرشايدة', category: 'shops' }),
  ];

  const [first] = getUndercoveredVillages(rows, 1);
  assert.equal(first.village.name, 'الرشايدة');
  assert.equal(first.listingCount, 1);
});
