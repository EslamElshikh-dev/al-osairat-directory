import {
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const publicPreview = process.argv.includes('--public-preview');
const cacheManifestPath = path.join(root, '.next/cache/activity-images/manifest.json');
const activityManifestPath = path.join(root, 'lib/data/activity-image-manifest.json');

const cacheManifest = JSON.parse(await readFile(cacheManifestPath, 'utf8'));
const activityManifest = JSON.parse(await readFile(activityManifestPath, 'utf8'));

const outputRoot = publicPreview
  ? path.join(root, 'public')
  : path.join(root, 'assets');
const packPath = path.join(outputRoot, publicPreview
  ? '_activity-image-baseline.pack'
  : 'activity-images-baseline.pack');
const manifestPath = path.join(outputRoot, publicPreview
  ? '_activity-image-baseline.json'
  : 'activity-images-baseline.json');

await mkdir(outputRoot, { recursive: true });

const payloads = [];
const headerEntries = [];
let offset = 0;

for (const [listingId, listing] of Object.entries(activityManifest)) {
  const cacheEntry = cacheManifest.entries?.[listingId];
  if (!cacheEntry || cacheEntry.src !== listing.src || !cacheEntry.fingerprint) {
    throw new Error(`Missing cache fingerprint for activity image: ${listingId}`);
  }

  const image = await readFile(path.join(root, 'public', listing.src.replace(/^\/+/, '')));
  payloads.push(image);
  headerEntries.push({
    listingId,
    src: listing.src,
    name: path.basename(listing.src),
    offset,
    length: image.length,
  });
  offset += image.length;
}

const header = Buffer.from(JSON.stringify({
  version: 1,
  visualRevision: cacheManifest.visualRevision,
  entries: headerEntries,
}));
const headerLength = Buffer.allocUnsafe(4);
headerLength.writeUInt32BE(header.length, 0);

await Promise.all([
  writeFile(packPath, Buffer.concat([headerLength, header, ...payloads])),
  writeFile(manifestPath, JSON.stringify({
    version: 1,
    visualRevision: cacheManifest.visualRevision,
    entries: cacheManifest.entries,
  }, null, 2)),
]);

console.log(
  `Exported activity image baseline: ${headerEntries.length} images · ${(offset / 1024 / 1024).toFixed(2)} MiB`,
);
