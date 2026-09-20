import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Visual VNext.2 is wired into the global layout', () => {
  const layout = read('app/layout.tsx');
  assert.match(layout, /visual-vnext2\.css/);
});

test('Blog exposes the editorial reading compass', () => {
  const page = read('app/blog/page.tsx');
  assert.match(page, /blog-compass/);
  assert.match(page, /بوصلة القراءة/);
});

test('News has a meaningful empty state', () => {
  const news = read('app/news/news-index.tsx');
  assert.match(news, /styles\.emptyState/);
  assert.match(news, /المرصد شغال/);
});

test('Sand carries the local VNext.2 voice', () => {
  const sand = read('components/sand-assistant.tsx');
  assert.match(sand, /أنا سَند… بتدور على إيه؟/);
  assert.match(sand, /دليل العسيرات · مساعد بحث محلي/);
});

test('Loading and 404 keep users inside the directory journey', () => {
  const loading = read('app/loading.tsx');
  const notFound = read('app/not-found.tsx');
  assert.match(loading, /directory-loading-preview/);
  assert.match(notFound, /\/directory/);
  assert.match(notFound, /\/villages/);
  assert.match(notFound, /\/news/);
  assert.match(notFound, /\/blog/);
});
