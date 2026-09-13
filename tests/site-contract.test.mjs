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

  assert.match(css, /max-width: 390px[\s\S]*?mobile-nav__item \{ min-height: 56px; font-size: 10px; \}/);
  assert.match(css, /max-width: 340px[\s\S]*?mobile-nav__label \{ font-size: 10px; \}/);
});

test('route loading state is meaningful and keeps the footer from jumping into view', async () => {
  const source = await readProjectFile('app/loading.tsx');

  assert.match(source, /status-page--loading/);
  assert.match(source, /aria-busy="true"/);
  assert.match(source, /نرتب لك دليل العسيرات/);
  assert.doesNotMatch(source, /return null/);
});

test('directory puts search results before supporting SEO links', async () => {
  const source = await readProjectFile('app/directory/page.tsx');

  assert.ok(source.indexOf('<DirectoryExplorer') < source.indexOf('directory-service-intents-title'));
});

test('emergency contacts expose an explicit accessible call action', async () => {
  const source = await readProjectFile('app/emergency/page.tsx');

  assert.match(source, /aria-label=\{`اتصال مباشر بـ/);
  assert.match(source, /emergency-card__call/);
});

test('final responsive QA keeps dense mobile content readable', async () => {
  const [css, home] = await Promise.all([
    readProjectFile('app/visual-redesign-phase4.css'),
    readProjectFile('app/page.tsx'),
  ]);

  assert.match(css, /home-category-section \.category-grid--editorial \.category-card/);
  assert.match(css, /listing-card__source\{font-size:11\.5px\}/);
  assert.match(css, /max-width:420px[\s\S]*?sand-invite\{display:none\}/);
  assert.match(home, /\(max-width: 420px\) 96px, \(max-width: 760px\) 112px/);
});

test('locality SEO hub is linked, searchable and included in the sitemap', async () => {
  const [page, shell, search, sitemap] = await Promise.all([
    readProjectFile('app/localities/page.tsx'),
    readProjectFile('components/site-shell.tsx'),
    readProjectFile('app/api/site-search/route.ts'),
    readProjectFile('app/sitemap.ts'),
  ]);

  assert.match(page, /نجوع وقرى العسيرات - الدليل الجغرافي الكامل/);
  assert.match(page, /'@type': 'ItemList'/);
  assert.match(page, /numberOfItems: localities\.length/);
  assert.match(shell, /href="\/localities"/);
  assert.match(search, /kind: 'locality'/);
  assert.match(sitemap, /absoluteUrl\('\/localities'\)/);
});

test('404 page has explicit non-indexable metadata', async () => {
  const source = await readProjectFile('app/not-found.tsx');

  assert.match(source, /title: 'الصفحة غير موجودة'/);
  assert.match(source, /robots: \{ index: false, follow: false \}/);
});
