import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('public category pages use revalidation instead of force-dynamic rendering', async () => {
  const source = await readProjectFile('app/directory/[category]/page.tsx');

  assert.match(source, /export const revalidate = 60/);
  assert.doesNotMatch(source, /export const dynamic = 'force-dynamic'/);
});

test('public directory skips canonical upstream reads while the canonical feature gate is disabled', async () => {
  const [publicDirectory, repository] = await Promise.all([
    readProjectFile('lib/public-directory.ts'),
    readProjectFile('lib/directory-repository.ts'),
  ]);

  assert.match(repository, /export const PUBLIC_CANONICAL_READS_ENABLED = false/);
  assert.match(publicDirectory, /if \(!PUBLIC_CANONICAL_READS_ENABLED\) return releaseListings/);
  assert.match(publicDirectory, /const canonicalCoverage = await getCanonicalDirectoryCoverage\(\)/);
});

test('Sand result cards safely expose useful contact actions', async () => {
  const [component, css, grounding, types] = await Promise.all([
    readProjectFile('components/sand-assistant.tsx'),
    readProjectFile('app/sand-assistant.css'),
    readProjectFile('lib/sand/grounding.ts'),
    readProjectFile('lib/sand/types.ts'),
  ]);

  assert.match(component, /function safeWhatsAppHref/);
  assert.match(component, /function safeGoogleMapsHref/);
  assert.match(component, />واتساب<\/a>/);
  assert.match(component, />الخريطة<\/a>/);
  assert.match(component, /rel="noopener noreferrer"/);
  assert.match(css, /\.sand-result__actions\s*\{[\s\S]*?flex-wrap:\s*wrap/);
  assert.match(grounding, /googleMapsUrl: cleanGroundingValue\(listing\.googleMapsUrl/);
  assert.match(types, /googleMapsUrl\?: string/);
});
