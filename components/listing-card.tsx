import Link from 'next/link';
import { categoryById, type DirectoryListing } from '@/lib/data';
import { googleMapsHref, phoneHref, sourceLabel } from '@/lib/site';
import { BrandMark } from './site-shell';
import { CategoryVisual } from './category-visual';
import { FavoriteButton } from './favorite-button';

export function ListingCard({ listing, compact = false }: { listing: DirectoryListing; compact?: boolean }) {
  const category = categoryById[listing.category];
  const phone = phoneHref(listing.phone);

  return (
    <article className={`listing-card listing-card--${listing.category}${compact ? ' listing-card--compact' : ''}`}>
      {listing.category !== 'emergency' && <FavoriteButton listingId={listing.id} variant="card" />}

      <div className="listing-card__header">
        <CategoryVisual category={listing.category} size={compact ? 'md' : 'lg'} />

        <div className="listing-card__identity">
          <span className="listing-card__category">{category.shortLabel}</span>
          <span className="listing-card__specialty">{listing.subCategory || category.shortLabel}</span>
        </div>

        <span className="listing-card__watermark" aria-hidden="true">
          <BrandMark compact />
        </span>
      </div>

      <div className="listing-card__top">
        {listing.sourceStatus === 'google_verified' && (
          <span className="source-chip source-chip--maps">مرجع خرائط Google</span>
        )}
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
        {(listing.googlePlaceId || listing.googleMapsUrl) && (
          <a href={googleMapsHref(listing)} target="_blank" rel="noreferrer" className="button button--ghost">
            الخريطة
          </a>
        )}
      </div>

      <span className="listing-card__source">{sourceLabel(listing)}</span>
    </article>
  );
}
