import type { DirectoryCategory } from '@/lib/data';

type CategoryVisualProps = {
  category: DirectoryCategory;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

function DoctorIcon() {
  return (
    <>
      <circle cx="32" cy="22" r="8" />
      <path d="M18 51c1-10 6-15 14-15s13 5 14 15" />
      <path d="M25 37v8l7 5 7-5v-8" />
      <path d="M23 42h-5v8" className="category-visual__accent" />
      <path d="M41 42h5v8" className="category-visual__accent" />
      <path d="M18 49a4 4 0 1 0 8 0" />
    </>
  );
}

function PharmacyIcon() {
  return (
    <>
      <path d="M18 20h28v31H18z" />
      <path d="M26 20v-6h12v6" />
      <path d="M32 28v15M24.5 35.5h15" className="category-visual__accent category-visual__bold" />
      <path d="M23 51v-5h18v5" />
    </>
  );
}

function StoreIcon() {
  return (
    <>
      <path d="M17 28h30l-3-10H20z" />
      <path d="M18 28v23h28V28" />
      <path d="M22 28c0 4 6 4 6 0 0 4 8 4 8 0 0 4 6 4 6 0" className="category-visual__accent" />
      <path d="M25 51V39h14v12" />
    </>
  );
}

function CraftsIcon() {
  return (
    <>
      <path d="M18 47 42 23" className="category-visual__bold" />
      <path d="M38 18a9 9 0 0 0-8 12l-12 12a5 5 0 0 0 7 7l12-12a9 9 0 0 0 10-12l-6 6-6-6z" />
      <path d="m17 20 8 8" className="category-visual__accent category-visual__bold" />
      <path d="m15 18 4-4 11 11-4 4z" />
    </>
  );
}

function RestaurantIcon() {
  return (
    <>
      <path d="M20 28c0-6 5-10 12-10s12 4 12 10" />
      <path d="M18 28h28v7H18z" />
      <path d="M22 35v16h20V35" />
      <path d="M27 44h10" className="category-visual__accent category-visual__bold" />
      <path d="M26 18c0-3 2-5 6-5s6 2 6 5" />
    </>
  );
}

function LawyersIcon() {
  return (
    <>
      <path d="M32 15v36M20 20h24" className="category-visual__bold" />
      <path d="m21 23-7 13h14zM43 23l-7 13h14z" />
      <path d="M23 51h18" className="category-visual__accent category-visual__bold" />
      <circle cx="32" cy="20" r="3" className="category-visual__accent-fill" />
    </>
  );
}

function ClericsIcon() {
  return (
    <>
      <path d="M19 15h22l6 6v30H19z" />
      <path d="M41 15v8h8" />
      <path d="M25 30h16M25 37h10" />
      <path d="m28 47 13-13 5 5-13 13-7 2z" className="category-visual__accent" />
    </>
  );
}

function GovernmentIcon() {
  return (
    <>
      <path d="M15 25 32 15l17 10z" />
      <path d="M18 48h28M21 27v18M29 27v18M37 27v18M45 27v18" />
      <path d="M15 52h34" className="category-visual__accent category-visual__bold" />
    </>
  );
}

function EmergencyIcon() {
  return (
    <>
      <path d="M20 42h24l-2-15c-1-7-5-11-10-11s-9 4-10 11z" />
      <path d="M17 42h30v8H17z" />
      <path d="M32 23v12M26 29h12" className="category-visual__accent category-visual__bold" />
      <path d="M15 25h-5M54 25h-5M18 15l-4-4M46 15l4-4" />
    </>
  );
}

function IconForCategory({ category }: { category: DirectoryCategory }) {
  switch (category) {
    case 'doctors': return <DoctorIcon />;
    case 'pharmacies': return <PharmacyIcon />;
    case 'shops': return <StoreIcon />;
    case 'crafts': return <CraftsIcon />;
    case 'restaurants': return <RestaurantIcon />;
    case 'lawyers': return <LawyersIcon />;
    case 'clerics': return <ClericsIcon />;
    case 'government': return <GovernmentIcon />;
    case 'emergency': return <EmergencyIcon />;
  }
}

export function CategoryVisual({ category, size = 'md', className = '' }: CategoryVisualProps) {
  return (
    <span className={`category-visual category-visual--${category} category-visual--${size} ${className}`.trim()} aria-hidden="true">
      <span className="category-visual__halo" />
      <svg viewBox="0 0 64 64" role="img" focusable="false">
        <IconForCategory category={category} />
      </svg>
    </span>
  );
}
