import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NEWS_PAGE_SIZE, getNewsPageCount, newsPageHref, paginateNews } from '../lib/news-pagination.ts';

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('news pagination keeps each page lightweight and preserves item order', () => {
  const items = Array.from({ length: 35 }, (_, index) => ({ id: index + 1 }));
  const firstPage = paginateNews(items, 1);
  const lastPage = paginateNews(items, 3);

  assert.equal(NEWS_PAGE_SIZE, 16);
  assert.equal(firstPage.pageItems.length, 16);
  assert.deepEqual(firstPage.pageItems.map((item) => item.id), Array.from({ length: 16 }, (_, index) => index + 1));
  assert.deepEqual(lastPage.pageItems.map((item) => item.id), [33, 34, 35]);
  assert.equal(lastPage.startItem, 33);
  assert.equal(lastPage.endItem, 35);
  assert.equal(lastPage.totalPages, 3);
  assert.equal(getNewsPageCount(0), 1);
  assert.equal(getNewsPageCount(63), 4);
  assert.equal(getNewsPageCount(80), 5);
});

test('news pagination rejects invalid and out-of-range pages', () => {
  const items = Array.from({ length: 17 }, (_, index) => index);

  assert.throws(() => paginateNews(items, 0), RangeError);
  assert.throws(() => paginateNews(items, 2.5), RangeError);
  assert.throws(() => paginateNews(items, 3), RangeError);
  assert.equal(newsPageHref(1), '/news#latest-news');
  assert.equal(newsPageHref(2), '/news/page/2#latest-news');
});

test('site-wide security policy covers core sources and blocks unsafe embedding', async () => {
  const config = await readProjectFile('next.config.ts');

  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /object-src 'none'/);
  assert.match(config, /frame-ancestors 'self'/);
  assert.match(config, /https:\/\/\*\.supabase\.co/);
  assert.match(config, /https:\/\/www\.googletagmanager\.com/);
});

test('small-phone navigation labels remain readable', async () => {
  const css = await readProjectFile('app/mobile-system.css');

  assert.match(css, /max-width: 390px[\s\S]*?mobile-nav__item \{ min-height: 56px; font-size: 9\.25px; \}/);
  assert.match(css, /max-width: 340px[\s\S]*?mobile-nav__label \{ font-size: 9px; \}/);
});

test('404 page has explicit non-indexable metadata', async () => {
  const source = await readProjectFile('app/not-found.tsx');

  assert.match(source, /title: 'الصفحة غير موجودة'/);
  assert.match(source, /robots: \{ index: false, follow: false \}/);
});
