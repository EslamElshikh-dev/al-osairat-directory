import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const manifest = JSON.parse(readFileSync(path.join(root, 'lib/data/activity-image-manifest.json'), 'utf8'));
const entries = Object.entries(manifest);
const packedSeedNames = new Set();
for (const shard of [1, 2, 3, 4]) {
  const packedSeeds = readFileSync(path.join(root, `assets/activity-seeds-${shard}.pack`));
  const seedHeaderLength = packedSeeds.readUInt32BE(0);
  const seedHeader = JSON.parse(packedSeeds.subarray(4, 4 + seedHeaderLength).toString('utf8'));
  for (const entry of seedHeader.entries) packedSeedNames.add(entry.name);
}

test('every registered activity has one distinct, optimized image file', () => {
  const sources = entries.map(([, image]) => image.src);

  assert.equal(entries.length, 323);
  assert.equal(new Set(sources).size, entries.length);
  for (const [, image] of entries) {
    assert.match(image.src, /^\/images\/activities\/activity-[a-f0-9]{14}\.webp$/);
    const seedExists = image.source.startsWith('activity-seeds/')
      ? packedSeedNames.has(path.basename(image.source))
      : existsSync(path.join(root, 'public/images', image.source));
    assert.ok(seedExists, `${image.source} seed is missing`);
    assert.ok(image.title.length > 1);
    assert.ok(image.village.length > 1);
  }
});

test('production build renders all individual WebP files from the manifest', () => {
  const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.equal(packageJson.scripts.prebuild, 'node scripts/render-activity-images.mjs');
  assert.ok(existsSync(path.join(root, 'scripts/render-activity-images.mjs')));
  assert.equal(packedSeedNames.size, 24);
});

test('listing image resolver uses the individual manifest and clear disclosure', () => {
  const source = readFileSync(path.join(root, 'lib/directory-images.ts'), 'utf8');

  assert.match(source, /activity-image-manifest\.json/);
  assert.match(source, /listingImages\[listing\.id\]/);
  assert.match(source, /صورة تعبيرية مخصصة/);
});
