import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('search includes broad category intent terms without creating a separate search index', async () => {
  const source = await readProjectFile('lib/directory-query.ts');

  assert.match(source, /transport:\s*'مواصلات نقل سواقين سائقين سواق مواصلات عامه'/);
  assert.match(source, /education:\s*'تعليم مدارس مدرسه معاهد معهد حضانات حضانه روضه'/);
  assert.match(source, /fieldRelevance\(categoryTerms, normalizedQuery, queryTokens, 42\)/);
  assert.match(source, /categorySearchTerms\[listing\.category\]/);
});

test('listing detail uses ranked related discovery and keeps return paths to village and category', async () => {
  const source = await readProjectFile('app/listing/[slug]/page.tsx');

  assert.match(source, /getRelatedListings\(listing, comparableListings, 4\)/);
  assert.match(source, /استكشف كل أنشطة/);
  assert.match(source, /villageCategoryDirectoryHref\(listing\.village, listing\.category\)/);
  assert.match(source, /كل .* في العسيرات/);
});

test('directory and village pages deliberately surface lower-coverage discovery paths', async () => {
  const [directory, village, discovery] = await Promise.all([
    readProjectFile('app/directory/page.tsx'),
    readProjectFile('app/villages/[slug]/page.tsx'),
    readProjectFile('lib/discovery.ts'),
  ]);

  assert.match(directory, /getUndercoveredVillages\(allListings, 4\)/);
  assert.match(directory, /تغطية متوازنة/);
  assert.match(village, /getLowCoverageCategories\(allListings, village\.name, 4\)/);
  assert.match(village, /قرى نوسّع حضورها داخل الدليل/);
  assert.match(discovery, /a\.categoryCount - b\.categoryCount/);
  assert.match(discovery, /a\.listingCount - b\.listingCount/);
});

test('zero-result search states offer recovery instead of a dead end', async () => {
  const source = await readProjectFile('components/directory-explorer.tsx');

  assert.match(source, /لا توجد نتائج مطابقة بهذه الدقة/);
  assert.match(source, /ابحث عن «\{query\}» في كل العسيرات/);
  assert.match(source, /صفحة القرية ←/);
  assert.match(source, /استكشف \{activeVillage\.name\}/);
});
