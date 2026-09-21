import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const projectUrl = (path) => new URL('../' + path, import.meta.url);
const readProjectFile = (path) => readFile(projectUrl(path), 'utf8');

const expectedArticles = [
  ['villages-al-osairat-guide', 'blog-villages-guide.webp'],
  ['health-services-al-osairat', 'blog-health-services.webp'],
  ['education-al-osairat', 'blog-education.webp'],
  ['transport-al-osairat', 'blog-transport-guide.webp'],
  ['markets-shopping-al-osairat', 'blog-markets.webp'],
  ['craftsmen-al-osairat', 'blog-craftsmen.webp'],
  ['agriculture-al-osairat', 'blog-agriculture.webp'],
  ['hayah-karima-al-osairat', 'blog-hayah-karima.webp'],
  ['government-postal-services-al-osairat', 'blog-government-services.webp'],
  ['how-to-use-al-osairat-directory', 'blog-use-directory.webp'],
];

test('SEO batch publishes exactly ten distinct practical guides', async () => {
  const batch = await readProjectFile('lib/blog-seo-batch.ts');
  const slugs = [...batch.matchAll(/    slug: '([^']+)'/g)].map((match) => match[1]);
  assert.equal(slugs.length, 10);
  assert.equal(new Set(slugs).size, 10);
  assert.deepEqual(slugs, expectedArticles.map(([slug]) => slug));
  assert.equal((batch.match(/publishedAt: publicationDate/g) || []).length, 10);
  assert.equal((batch.match(/updatedAt: publicationDate/g) || []).length, 10);
});

test('every new guide has rich sections FAQs sources and SEO metadata', async () => {
  const batch = await readProjectFile('lib/blog-seo-batch.ts');
  const articleStarts = [...batch.matchAll(/  \{\n    slug: '([^']+)'/g)];

  for (const [index, match] of articleStarts.entries()) {
    const next = articleStarts[index + 1];
    const article = batch.slice(match.index, next?.index ?? batch.lastIndexOf('\n];'));
    assert.ok((article.match(/\n        id: '/g) || []).length >= 6, `${match[1]} needs at least six sections`);
    assert.ok((article.match(/\{ question:/g) || []).length >= 4, `${match[1]} needs at least four FAQs`);
    assert.ok((article.match(/\{ label:/g) || []).length >= 2, `${match[1]} needs at least two sources`);
    assert.match(article, /seoTitle: '[^']+'/);
    assert.match(article, /description: '[^']+'/);
    assert.match(article, /highlight: '[^']+'/);
  }
});

test('custom WebP covers exist and stay within the performance budget', async () => {
  const batch = await readProjectFile('lib/blog-seo-batch.ts');

  for (const [, filename] of expectedArticles) {
    assert.ok(batch.includes(`/images/directory/${filename}`));
    const image = await stat(projectUrl(`public/images/directory/${filename}`));
    assert.ok(image.size > 30_000, `${filename} looks unexpectedly small`);
    assert.ok(image.size < 220_000, `${filename} exceeds the 220 KB cover budget`);
  }
});

test('new guides flow through publishing discovery journeys evidence and sitemap', async () => {
  const [published, discovery, journeys, evidence, sitemap] = await Promise.all([
    readProjectFile('lib/blog-published.ts'),
    readProjectFile('lib/blog-discovery.ts'),
    readProjectFile('lib/blog-navigation.ts'),
    readProjectFile('lib/blog-section-sources.ts'),
    readProjectFile('app/sitemap.ts'),
  ]);

  assert.match(published, /\.\.\.seoBlogArticles/);
  assert.match(sitemap, /blogArticles\.map/);
  for (const [slug] of expectedArticles) {
    assert.ok(discovery.includes(`'${slug}'`), `${slug} missing from discovery`);
    assert.ok(journeys.includes(`'${slug}'`), `${slug} missing from article journeys`);
    assert.ok(evidence.includes(`'${slug}'`), `${slug} missing from contextual evidence`);
  }
});

