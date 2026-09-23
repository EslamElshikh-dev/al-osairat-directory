import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const projectUrl = (path) => new URL('../' + path, import.meta.url);
const readProjectFile = (path) => readFile(projectUrl(path), 'utf8');

const expectedVillageStories = [
  ['awlad-hamza-heart-of-al-osairat', 'story-awlad-hamza.webp'],
  ['awlad-gabara-old-roots-al-osairat', 'story-awlad-gabara.webp'],
  ['geziret-awlad-hamza-story', 'story-geziret-awlad-hamza.webp'],
  ['rashida-al-osairat-place-story', 'story-rashida.webp'],
  ['nuwairat-from-hamza-to-village', 'story-nuwairat.webp'],
  ['awamer-al-osairat-name-history', 'story-awamer.webp'],
  ['al-shuhada-al-osairat-name-memory', 'story-al-shuhada.webp'],
  ['al-ahaiwa-gharb-name-history', 'story-al-ahaiwa-gharb.webp'],
  ['masaeed-al-osairat-tukh-story', 'story-masaeed.webp'],
  ['awlad-bahig-al-osairat-history', 'story-awlad-bahig.webp'],
];

test('village story cluster contains exactly ten distinct locality articles', async () => {
  const batch = await readProjectFile('lib/blog-village-stories.ts');
  const slugs = [...batch.matchAll(/    slug: '([^']+)'/g)].map((match) => match[1]);
  assert.equal(slugs.length, 10);
  assert.equal(new Set(slugs).size, 10);
  assert.deepEqual(slugs, expectedVillageStories.map(([slug]) => slug));
});

test('each village story has rich editorial structure FAQs sources and dedicated cover', async () => {
  const batch = await readProjectFile('lib/blog-village-stories.ts');
  const articleStarts = [...batch.matchAll(/  \{\n    slug: '([^']+)'/g)];

  for (const [index, match] of articleStarts.entries()) {
    const next = articleStarts[index + 1];
    const article = batch.slice(match.index, next?.index ?? batch.lastIndexOf('\n];'));
    assert.ok((article.match(/\n        id: '/g) || []).length >= 6, `${match[1]} needs at least six sections`);
    assert.ok((article.match(/\{ question:/g) || []).length >= 4, `${match[1]} needs at least four FAQs`);
    assert.ok((article.match(/\{ label:/g) || []).length >= 3, `${match[1]} needs at least three sources`);
    assert.match(article, /seoTitle: '[^']+'/);
    assert.match(article, /description: '[^']+'/);
    assert.match(article, /highlight: '[^']+'/);
  }

  for (const [, filename] of expectedVillageStories) {
    assert.ok(batch.includes(`/images/directory/${filename}`));
    const image = await stat(projectUrl(`public/images/directory/${filename}`));
    assert.ok(image.size > 30_000, `${filename} looks unexpectedly small`);
    assert.ok(image.size < 220_000, `${filename} exceeds the 220 KB cover budget`);
  }
});

test('village stories flow through publishing discovery journeys evidence and sitemap', async () => {
  const [published, discovery, journeys, evidence, sitemap] = await Promise.all([
    readProjectFile('lib/blog-published.ts'),
    readProjectFile('lib/blog-discovery.ts'),
    readProjectFile('lib/blog-navigation.ts'),
    readProjectFile('lib/blog-section-sources.ts'),
    readProjectFile('app/sitemap.ts'),
  ]);

  assert.match(published, /\.\.\.villageStoryArticles/);
  assert.match(sitemap, /blogArticles\.map/);

  for (const [slug] of expectedVillageStories) {
    assert.ok(discovery.includes(`'${slug}'`), `${slug} missing from discovery`);
    assert.ok(journeys.includes(`'${slug}'`), `${slug} missing from article journeys`);
    assert.ok(evidence.includes(`'${slug}'`), `${slug} missing from contextual evidence`);
  }
});
