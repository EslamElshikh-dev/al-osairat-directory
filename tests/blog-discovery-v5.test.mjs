import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('blog discovery defines stable topic buckets for all five articles', async () => {
  const discovery = await readProjectFile('lib/blog-discovery.ts');
  for (const slug of [
    'markaz-al-osairat',
    'al-osairat-landmarks',
    'origin-name-al-osairat',
    'al-osairat-famous-people',
    'famous-families-al-osairat',
  ]) assert.ok(discovery.includes("'" + slug + "'"));
  for (const topic of ['place','history','people','families']) assert.ok(discovery.includes("'" + topic + "'"));
});

test('Arabic search normalization removes common orthographic variance', async () => {
  const discovery = await readProjectFile('lib/blog-discovery.ts');
  assert.match(discovery, /replace\(\/\[إأآٱ\]\/g, 'ا'\)/);
  assert.match(discovery, /replace\(\/ى\/g, 'ي'\)/);
  assert.match(discovery, /replace\(\/ة\/g, 'ه'\)/);
  assert.match(discovery, /replace\(\/\[\\u064B-\\u065F\\u0670\]\/g, ''\)/);
});

test('all article cards remain server-rendered with discovery data attributes', async () => {
  const page = await readProjectFile('app/blog/page.tsx');
  assert.match(page, /blogArticles\.map/);
  assert.match(page, /data-blog-discovery-card/);
  assert.match(page, /data-blog-topic=\{getBlogDiscoveryTopic\(article\.slug\)\}/);
  assert.match(page, /data-blog-search=\{searchableText\}/);
  assert.match(page, /<BlogCard article=\{article\}/);
});

test('discovery client island filters existing DOM without fetching articles', async () => {
  const controls = await readProjectFile('components/blog-discovery-controls.tsx');
  assert.match(controls, /querySelectorAll<HTMLElement>\('\[data-blog-discovery-card\]'\)/);
  assert.match(controls, /card\.hidden = !visible/);
  assert.doesNotMatch(controls, /fetch\(/);
  assert.match(controls, /event\.key === '\/'/);
  assert.match(controls, /event\.key === 'Escape'/);
});

test('discovery UI has result count empty state and responsive styling', async () => {
  const controls = await readProjectFile('components/blog-discovery-controls.tsx');
  const css = await readProjectFile('app/blog.css');
  assert.match(controls, /visibleCount/);
  assert.match(controls, /blog-discovery-empty/);
  assert.match(css, /\.blog-discovery-controls/);
  assert.match(css, /\.blog-discovery-card-shell\[hidden\]/);
  assert.match(css, /@media \(max-width: 560px\)/);
});
