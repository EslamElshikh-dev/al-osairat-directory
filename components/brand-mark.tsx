import Image from '@/components/site-image';

export function BrandMark({ compact = false, full = false, eager = false }: { compact?: boolean; full?: boolean; eager?: boolean }) {
  return (
    <span className={`brand-mark brand-mark--rider${compact ? ' brand-mark--compact' : ''}${full ? ' brand-mark--full' : ''}`} aria-hidden="true">
      <Image src={full ? '/brand/usayrat-rider-logo.webp' : '/brand/usayrat-rider-emblem.webp'} alt="" width={full ? 160 : 64} height={full ? 160 : 64} sizes={full ? '160px' : '64px'} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} />
    </span>
  );
}
