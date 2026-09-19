import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('blog source classifier separates official academic press maps and local references', async () => {
  const sourceTrust = await readProjectFile('lib/blog-source-trust.ts');
  for (const kind of ['official','academic','press','maps','local']) assert.ok(sourceTrust.includes(kind));
  assert.match(sourceTrust, /endsWith\('\.gov\.eg'\)/);
  assert.match(sourceTrust, /journals\.ekb\.eg/);
  assert.match(sourceTrust, /pressHosts/);
  assert.match(sourceTrust, /maps\.google\.com/);
});

test('article pages show last review date reference count and source kinds', async () => {
  const page = await readProjectFile('app/blog/[slug]/page.tsx');
  assert.match(page, /article-evidence/);
  assert.match(page, /آخر مراجعة/);
  assert.match(page, /المراجع والروابط/);
  assert.match(page, /sourceSummary\.total/);
  assert.match(page, /blogSourceKindLabels/);
});

test('source list labels each reference without replacing the original link', async () => {
  const page = await readProjectFile('app/blog/[slug]/page.tsx');
  assert.match(page, /classifyBlogSource\(source\.url\)/);
  assert.match(page, /article-source-kind/);
  assert.match(page, /href=\{source\.url\}/);
});

test('blog index provides three server-rendered starting paths', async () => {
  const page = await readProjectFile('app/blog/page.tsx');
  assert.match(page, /blog-start-here/);
  assert.match(page, /ابدأ من هنا/);
  assert.match(page, /\/blog\/markaz-al-osairat/);
  assert.match(page, /\/blog\/origin-name-al-osairat/);
  assert.match(page, /\/blog\/famous-families-al-osairat/);
});

test('editorial trust UI stays responsive', async () => {
  const css = await readProjectFile('app/blog.css');
  assert.match(css, /\.article-evidence/);
  assert.match(css, /\.article-source-kind--official/);
  assert.match(css, /\.blog-start-here__grid/);
  assert.match(css, /@media \(max-width: 560px\)/);
});
