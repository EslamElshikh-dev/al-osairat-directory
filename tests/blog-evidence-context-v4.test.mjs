import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('contextual evidence maps real sections to supporting references', async () => {
  const mapping = await readProjectFile('lib/blog-section-sources.ts');
  assert.match(mapping, /'markaz-al-osairat'/);
  assert.match(mapping, /'al-osairat-landmarks'/);
  assert.match(mapping, /'al-osairat-famous-people'/);
  assert.match(mapping, /'origin-name-al-osairat'/);
  assert.match(mapping, /population:/);
  assert.match(mapping, /railway:/);
  assert.match(mapping, /'public-life':/);
});

test('article page renders contextual section references and copy controls', async () => {
  const page = await readProjectFile('app/blog/[slug]/page.tsx');
  assert.match(page, /getBlogSectionSourceUrls\(article\.slug, section\.id\)/);
  assert.match(page, /article-section-evidence/);
  assert.match(page, /data-copy-section=\{section\.id\}/);
  assert.match(page, /ArticleUtilityController articleUrl=\{articleUrl\}/);
});

test('article utility controller uses one delegated client listener for section copy', async () => {
  const utility = await readProjectFile('components/article-utility-controller.tsx');
  assert.match(utility, /closest<HTMLButtonElement>\('\[data-copy-section\]'\)/);
  assert.match(utility, /document\.addEventListener\('click', onClick\)/);
  assert.match(utility, /window\.print\(\)/);
  assert.match(utility, /نسخ رابط المقال/);
});

test('print mode removes interactive chrome but keeps article content', async () => {
  const css = await readProjectFile('app/blog.css');
  assert.match(css, /@media print/);
  assert.match(css, /\.article-reading-progress/);
  assert.match(css, /\.article-utility/);
  assert.match(css, /\.related-articles/);
  assert.match(css, /break-inside: avoid/);
});

test('contextual evidence stays compact on mobile', async () => {
  const css = await readProjectFile('app/blog.css');
  assert.match(css, /\.article-section__heading/);
  assert.match(css, /\.article-section-evidence/);
  assert.match(css, /@media \(max-width: 620px\)/);
});
