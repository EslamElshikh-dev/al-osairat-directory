import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('all five blog articles have curated reading journeys', async () => {
  const nav = await readProjectFile('lib/blog-navigation.ts');
  for (const slug of [
    'markaz-al-osairat',
    'al-osairat-landmarks',
    'al-osairat-famous-people',
    'origin-name-al-osairat',
    'famous-families-al-osairat',
  ]) assert.ok(nav.includes("'" + slug + "'"));
  assert.ok((nav.match(/relatedSlugs:/g) || []).length >= 5);
  assert.ok((nav.match(/afterSectionId:/g) || []).length >= 7);
});

test('article page uses curated related posts and sequence navigation', async () => {
  const page = await readProjectFile('app/blog/[slug]/page.tsx');
  assert.match(page, /getArticleJourney\(article\.slug\)/);
  assert.match(page, /journey\.relatedSlugs/);
  assert.match(page, /previousArticle/);
  assert.match(page, /nextArticle/);
  assert.match(page, /article-sequence/);
  assert.match(page, /article-journey/);
});

test('reading progress component is lightweight and passive', async () => {
  const progress = await readProjectFile('components/article-reading-progress.tsx');
  assert.match(progress, /requestAnimationFrame/);
  assert.match(progress, /passive: true/);
  assert.doesNotMatch(progress, /setInterval|setTimeout/);
  assert.match(progress, /aria-hidden="true"/);
});

test('blog cards surface modified article freshness', async () => {
  const card = await readProjectFile('components/blog-card.tsx');
  assert.match(card, /updatedAt !== publishedArticle\.publishedAt/);
  assert.match(card, /blog-card__updated/);
  assert.match(card, /محدّث/);
});

test('blog journey UI stays responsive and motion-aware', async () => {
  const css = await readProjectFile('app/blog.css');
  assert.match(css, /\.article-reading-progress/);
  assert.match(css, /\.article-journey/);
  assert.match(css, /\.article-sequence/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
