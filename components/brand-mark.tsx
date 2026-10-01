export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span className="brand-mark__ring" />
      <span className="brand-mark__dot" />
      {!compact && <span className="brand-mark__line" />}
    </span>
  );
}

