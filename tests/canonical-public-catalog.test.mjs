import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalSnapshotHasReleaseParity } from '../lib/canonical-parity.ts';

const listing = (overrides = {}) => ({
  id: 'shops-example',
  slug: 'example',
  title: 'Example',
  category: 'shops',
  location: 'العسيرات',
  village: 'مركز العسيرات',
  reviewCount: 0,
  source: 'legacy_directory',
  sourceStatus: 'source_only',
  ...overrides,
});

test('canonical parity rejects missing or extra active records', () => {
  const current = [listing(), listing({ id: 'shops-second', slug: 'second', title: 'Second' })];
  assert.equal(canonicalSnapshotHasReleaseParity([listing()], current), false);
  assert.equal(canonicalSnapshotHasReleaseParity([...current, listing({ id: 'shops-third', slug: 'third' })], current), false);
});

test('canonical parity rejects stale or same-timestamp conflicting data', () => {
  const current = [listing({ title: 'Current', lastUpdatedAt: '2026-09-18' })];
  assert.equal(canonicalSnapshotHasReleaseParity([listing({ title: 'Old', lastUpdatedAt: '2026-09-17' })], current), false);
  assert.equal(canonicalSnapshotHasReleaseParity([listing({ title: 'Old', lastUpdatedAt: '2026-09-18' })], current), false);
});

test('canonical parity accepts exact release parity and genuinely newer canonical data', () => {
  const current = [listing({ title: 'Current', lastUpdatedAt: '2026-09-18' })];
  assert.equal(canonicalSnapshotHasReleaseParity([...current], current), true);
  assert.equal(canonicalSnapshotHasReleaseParity([listing({ title: 'Authority update', lastUpdatedAt: '2026-09-18T03:30:00+03:00' })], current), true);
});
