import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('editorial refresh covers all five published blog articles', async () => {
  const refresh = await readProjectFile('lib/blog-refresh.ts');
  const slugs = [
    'markaz-al-osairat',
    'al-osairat-landmarks',
    'al-osairat-famous-people',
    'origin-name-al-osairat',
    'famous-families-al-osairat',
  ];
  for (const slug of slugs) assert.ok(refresh.includes("'" + slug + "'"));
  assert.match(refresh, /updatedAt: '2026-09-19'/);
});

test('article refresh keeps evidence-sensitive language explicit', async () => {
  const refresh = await readProjectFile('lib/blog-refresh.ts');
  assert.match(refresh, /لا تثبت نسبًا أو عددًا أو أقدمية/);
  assert.match(refresh, /لا ترتيب شهرة/);
  assert.match(refresh, /لا لتقييم المواقف أو المفاضلة بين الأشخاص/);
  assert.match(refresh, /وثيقة أرشيفية أو دراسة أكاديمية محكمة/);
});

test('inline article media stays local and carries source references', async () => {
  const refresh = await readProjectFile('lib/blog-refresh.ts');
  const mediaImages = [...refresh.matchAll(/image: '([^']+)'/g)].map((match) => match[1]);
  assert.ok(mediaImages.length >= 4);
  assert.ok(mediaImages.every((image) => image.startsWith('/images/')));
  assert.ok((refresh.match(/sourceUrl:/g) || []).length >= mediaImages.length);
});

test('article page renders referenced media and includes media sources in citations', async () => {
  const page = await readProjectFile('app/blog/[slug]/page.tsx');
  assert.match(page, /section\.media\?\.sourceUrl/);
  assert.match(page, /article-section-media/);
  assert.match(page, /sourceLabel/);
  assert.match(page, /unoptimized=\{section\.media\.image\.endsWith\('\.svg'\)\}/);
});

test('published articles apply expansions before editorial refresh', async () => {
  const published = await readProjectFile('lib/blog-published.ts');
  assert.match(published, /expandedFamilyArticle\(article\)/);
  assert.match(published, /famousPeopleArticle\(article\)/);
  assert.match(published, /refreshBlogArticle\(expanded\)/);
});

test('blog CSS contains inline media styling', async () => {
  const css = await readProjectFile('app/blog.css');
  assert.match(css, /\.article-section-media/);
  assert.match(css, /aspect-ratio: 16 \/ 9/);
  assert.match(css, /\.article-section-media figcaption/);
});
