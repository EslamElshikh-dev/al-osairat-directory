import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Header VNext is the final visual layer and stays compact', async () => {
  const [layout, css] = await Promise.all([
    readProjectFile('app/layout.tsx'),
    readProjectFile('app/header-vnext.css'),
  ]);

  assert.ok(layout.indexOf("import './header-vnext.css';") > layout.indexOf("import './smart-local-compass.css';"));
  assert.match(css, /\.site-header__inner\s*\{[^}]*min-height:\s*62px/s);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*?\.site-header__inner\s*\{[^}]*min-height:\s*56px/s);
  assert.doesNotMatch(css, /backdrop-filter/);
});

test('Header VNext keeps mobile controls at safe tap sizes', async () => {
  const css = await readProjectFile('app/header-vnext.css');

  assert.match(css, /\.site-header \.header-mobile-action,[\s\S]*?min-height:\s*40px/);
  assert.match(css, /@media \(max-width:\s*340px\)[\s\S]*?\.brand__copy\s*\{\s*display:\s*none/);
});
