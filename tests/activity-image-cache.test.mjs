import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  createActivityImageFingerprint,
  isActivityImageCacheHit,
} from '../scripts/activity-image-cache.mjs';

const baseListing = {
  src: '/images/activities/activity-test.webp',
  source: 'activity-seeds/medical-clinic.webp',
  title: 'عيادة اختبار',
  village: 'أولاد حمزة',
};

function fingerprint(overrides = {}) {
  return createActivityImageFingerprint({
    listingId: 'test-listing',
    listing: { ...baseListing, ...(overrides.listing || {}) },
    sourceDigest: overrides.sourceDigest || 'source-a',
    visualRevision: overrides.visualRevision || 'renderer-a',
  });
}

test('activity image fingerprints are stable for unchanged visual inputs', () => {
  assert.equal(fingerprint(), fingerprint());
});

test('activity image fingerprint changes when title, village, source bytes or visual revision changes', () => {
  const original = fingerprint();

  assert.notEqual(fingerprint({ listing: { title: 'عيادة مختلفة' } }), original);
  assert.notEqual(fingerprint({ listing: { village: 'الرشايدة' } }), original);
  assert.notEqual(fingerprint({ listing: { source: 'activity-seeds/dentist.webp' } }), original);
  assert.notEqual(fingerprint({ listing: { sourceKind: 'owner_photo' } }), original);
  assert.notEqual(fingerprint({ sourceDigest: 'source-b' }), original);
  assert.notEqual(fingerprint({ visualRevision: 'renderer-b' }), original);
});

test('cache hit requires the same fingerprint, output path and an existing cached file', () => {
  const value = fingerprint();
  const entry = { fingerprint: value, src: baseListing.src };

  assert.equal(isActivityImageCacheHit({
    previousEntry: entry,
    fingerprint: value,
    src: baseListing.src,
    cachedFileExists: true,
  }), true);

  assert.equal(isActivityImageCacheHit({
    previousEntry: entry,
    fingerprint: 'different',
    src: baseListing.src,
    cachedFileExists: true,
  }), false);

  assert.equal(isActivityImageCacheHit({
    previousEntry: entry,
    fingerprint: value,
    src: '/images/activities/other.webp',
    cachedFileExists: true,
  }), false);

  assert.equal(isActivityImageCacheHit({
    previousEntry: entry,
    fingerprint: value,
    src: baseListing.src,
    cachedFileExists: false,
  }), false);
});

test('renderer uses the Next build cache, copies hits and renders misses with bounded concurrency', async () => {
  const source = await readFile(new URL('../scripts/render-activity-images.mjs', import.meta.url), 'utf8');

  assert.match(source, /\.next\/cache\/activity-images/);
  assert.match(source, /copyFile\(cachePath, outputPath\)/);
  assert.match(source, /stats\.reused \+= 1/);
  assert.match(source, /stats\.rendered \+= 1/);
  assert.match(source, /ACTIVITY_IMAGE_RENDER_CONCURRENCY/);
  assert.match(source, /Math\.min\(4,/);
});
