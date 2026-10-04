'use client';

import Image, { type ImageProps } from 'next/image';
import manifest from '@/lib/site-image-manifest.json';

type MediaEntry = { hash: string; widths: number[] };
const media = manifest as Record<string, MediaEntry>;
export default function SiteImage(props: ImageProps) {
  const src = typeof props.src === 'string' ? props.src.split('?')[0] : '';
  const entry = media[src];
  if (!entry || props.unoptimized || props.loader) return <Image {...props} />;
  return <Image {...props} loader={({ width }) => {
    const size = entry.widths.find(value => value >= width) ?? entry.widths[entry.widths.length - 1];
    return `/images/mobile/${entry.hash}-${size}.webp`;
  }} />;
}
