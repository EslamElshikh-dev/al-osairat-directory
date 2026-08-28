import Link from 'next/link';
import { categoryById, type DirectoryListing } from '@/lib/data';
import { googleMapsHref, phoneHref, sourceLabel } from '@/lib/site';
import { BrandMark } from './site-shell';

export function ListingCard({ listing, compact = false }: { listing: DirectoryListing; compact?: boolean }) {
  const category = categoryById[listing.category];
  const phone = phoneHref(listing.phone);

  return (
    <article className={`listing-card listing-card--${listing.category}${compact ? ' listing-card--compact' : ''}`}>
      <div className="listing-card__top">
        <div className="listing-card__brand">
          <span className="listing-card__brand-mark" aria-hidden="true">
            <BrandMark compact />
          </span>
          <span>{category.shortLabel}</span>
        </div>
        <div className="listing-card__eyebrow">
          <span>{listing.subCategory || category.shortLabel}</span>
          {listing.sourceStatus === 'google_verified' && <span className="source-chip">خرائط Google</span>}
        </div>
        <h3>
          <Link href={`/listing/${listing.slug}`}>{listing.title}</Link>
        </h3>
        <p className="listing-card__location">{listing.location}</p>
      </div>

      {!compact && (
        <div className="listing-card__meta">
          <span>{listing.village}</span>
          {listing.hours && <span>{listing.hours}</span>}
          {listing.deliveryAvailable && <span>توصيل متاح</span>}
        </div>
      )}

      <div className="listing-card__actions">
        <Link href={`/listing/${listing.slug}`} className="button button--primary">
          عرض التفاصيل
        </Link>
        {phone && (
          <a href={phone} className="button button--soft">
            اتصال
          </a>
        )}
        {listing.googlePlaceId && (
          <a href={googleMapsHref(listing)} target="_blank" rel="noreferrer" className="button button--ghost">
            الخريطة
          </a>
        )}
      </div>
      <span className="listing-card__source">{sourceLabel(listing)}</span>
    </article>
  );
}
