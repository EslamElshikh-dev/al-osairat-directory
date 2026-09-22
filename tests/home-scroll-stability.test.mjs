import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('homepage motion avoids scroll-linked opacity and permanent compositor layers', async () => {
  const [motion, phaseFour] = await Promise.all([
    readProjectFile('app/motion.css'),
    readProjectFile('app/visual-redesign-phase4.css'),
  ]);

  assert.doesNotMatch(motion, /animation-timeline\s*:\s*view/);
  assert.doesNotMatch(motion, /osairat-view-reveal/);
  assert.doesNotMatch(motion, /osairat-ambient/);
  assert.doesNotMatch(phaseFour, /will-change\s*:\s*transform\s*,\s*opacity/);
});

test('optimized images keep a useful deployment-safe browser cache', async () => {
  const config = await readProjectFile('next.config.ts');

  assert.match(config, /minimumCacheTTL:\s*60 \* 60 \* 24 \* 7/);
});

test('homepage preloads a compact review preview before it reaches the viewport', async () => {
  const [home, reviews, api, globals, shell, phaseOne, phaseFour] = await Promise.all([
    readProjectFile('app/page.tsx'),
    readProjectFile('components/member-reviews.tsx'),
    readProjectFile('app/api/content-reviews/route.ts'),
    readProjectFile('app/globals.css'),
    readProjectFile('app/shell-upgrade.css'),
    readProjectFile('app/visual-redesign-phase1.css'),
    readProjectFile('app/visual-redesign-phase4.css'),
  ]);

  assert.match(home, /pageSize=\{2\}/);
  assert.match(home, /activationMargin="3600px 0px"/);
  assert.match(reviews, /rootMargin: activationMargin/);
  assert.match(api, /Math\.min\(MAX_PAGE_SIZE, pageSizeRaw\)/);
  assert.doesNotMatch([globals, shell, phaseOne].join('\n'), /\.site-header\s*\{[^}]*backdrop-filter/s);
  assert.match(phaseFour, /\.site-header\{[^}]*background:rgba\(247,244,237,\.98\)!important/);
});
