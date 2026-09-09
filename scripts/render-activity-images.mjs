import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const outputDirectory = path.join(root, 'public/images/activities');
const manifest = JSON.parse(await readFile(path.join(root, 'lib/data/activity-image-manifest.json'), 'utf8'));
const seedImages = new Map();
for (const shard of [1, 2, 3, 4]) {
  const packedSeeds = await readFile(path.join(root, `assets/activity-seeds-${shard}.pack`));
  const seedHeaderLength = packedSeeds.readUInt32BE(0);
  const seedHeader = JSON.parse(packedSeeds.subarray(4, 4 + seedHeaderLength).toString('utf8'));
  const seedPayloadOffset = 4 + seedHeaderLength;
  for (const entry of seedHeader.entries) {
    seedImages.set(
      entry.name,
      packedSeeds.subarray(seedPayloadOffset + entry.offset, seedPayloadOffset + entry.offset + entry.length),
    );
  }
}

const palettes = [
  ['#d7ad53', '#0a3329'],
  ['#d17f4b', '#183a32'],
  ['#78a88e', '#102f28'],
  ['#b88b68', '#183b46'],
  ['#cf9b57', '#382f28'],
  ['#7fa1b2', '#17352e'],
];

function hashBytes(value) {
  return createHash('sha256').update(value).digest();
}

function escapeXml(value) {
  return value.replace(/[<>&'"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character] || character);
}

function clipped(value, maximum) {
  return value.length <= maximum ? value : `${value.slice(0, maximum - 1).trim()}…`;
}

function sourceInput(source) {
  if (!source.startsWith('activity-seeds/')) return path.join(root, 'public/images', source);
  const image = seedImages.get(path.basename(source));
  if (!image) throw new Error(`Missing packed activity seed: ${source}`);
  return image;
}

function overlayFor(listing, bytes) {
  const [accent, deep] = palettes[bytes[5] % palettes.length];
  const title = escapeXml(clipped(listing.title, 46));
  const village = escapeXml(clipped(listing.village, 31));
  const scope = listing.village === 'مركز العسيرات' ? village : `${village} · مركز العسيرات`;
  const fontSize = title.length > 35 ? 25 : title.length > 25 ? 29 : 33;
  const circleX = 70 + (bytes[6] % 80);
  const circleY = 60 + (bytes[7] % 70);

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="533" viewBox="0 0 800 533">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.44" stop-color="${deep}" stop-opacity="0" />
          <stop offset="1" stop-color="${deep}" stop-opacity="0.86" />
        </linearGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="0.4" /></filter>
      </defs>
      <rect width="800" height="533" fill="url(#shade)" />
      <circle cx="${circleX}" cy="${circleY}" r="54" fill="${accent}" opacity="0.16" />
      <circle cx="${circleX}" cy="${circleY}" r="36" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.23" />
      <path d="M52 355 H748" stroke="${accent}" stroke-width="3" opacity="0.85" />
      <text x="748" y="409" text-anchor="end" fill="#fff" font-family="DejaVu Sans" font-size="${fontSize}" font-weight="700" filter="url(#soft)">${title}</text>
      <text x="748" y="448" text-anchor="end" fill="${accent}" font-family="DejaVu Sans" font-size="18" font-weight="700">${scope}</text>
    </svg>
  `);
}

await mkdir(outputDirectory, { recursive: true });

for (const [listingId, listing] of Object.entries(manifest)) {
  const bytes = hashBytes(listingId);
  const outputPath = path.join(root, 'public', listing.src);
  const canvasWidth = 860;
  const canvasHeight = 573;
  const left = bytes[0] % (canvasWidth - 800 + 1);
  const top = bytes[1] % (canvasHeight - 533 + 1);
  const brightness = 0.94 + (bytes[2] % 10) / 100;
  const saturation = 0.94 + (bytes[3] % 18) / 100;
  const hue = (bytes[4] % 13) - 6;

  let pipeline = sharp(sourceInput(listing.source)).resize(canvasWidth, canvasHeight, { fit: 'cover' });
  if (bytes[8] % 2 === 1) pipeline = pipeline.flop();

  await pipeline
    .extract({ left, top, width: 800, height: 533 })
    .modulate({ brightness, saturation, hue })
    .composite([{ input: overlayFor(listing, bytes), top: 0, left: 0 }])
    .webp({ quality: 70, effort: 5, smartSubsample: true })
    .toFile(outputPath);
}

console.log(`Rendered ${Object.keys(manifest).length} individual activity images.`);
