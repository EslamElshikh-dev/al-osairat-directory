import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Smart Local Compass is available on the home and directory entry points', () => {
  const home = read('app/page.tsx');
  const directory = read('app/directory/page.tsx');
  const layout = read('app/layout.tsx');

  assert.match(home, /SmartLocalCompass/);
  assert.match(directory, /SmartLocalCompass/);
  assert.match(layout, /smart-local-compass\.css/);
});

test('Smart Local Compass keeps a server form fallback and safe local suggestions', () => {
  const compass = read('components/smart-local-compass.tsx');

  assert.match(compass, /action="\/directory"/);
  assert.match(compass, /method="get"/);
  assert.match(compass, /\/api\/site-search\?q=/);
  assert.match(compass, /item\.href\.startsWith\('\/'\)/);
  assert.match(compass, /role="combobox"/);
  assert.match(compass, /role="listbox"/);
  assert.match(compass, /ArrowDown/);
  assert.match(compass, /ArrowUp/);
});

test('recent searches stay private to the device and motion is respectful', () => {
  const compass = read('components/smart-local-compass.tsx');
  const css = read('app/smart-local-compass.css');

  assert.match(compass, /window\.localStorage/);
  assert.match(compass, /slice\(0, 3\)/);
  assert.doesNotMatch(compass, /api\/analytics/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
