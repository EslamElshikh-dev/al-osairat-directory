import Image from 'next/image';
import Link from 'next/link';
import { categoryById, type DirectoryListing } from '@/lib/data';
import { imageForListing } from '@/lib/directory-images';
import { latestScanImageForListing } from '@/lib/latest-scan-images';
import { googleMapsHref, phoneHref, sourceLabel } from '@/lib/site';
import { BrandMark } from './site-shell';
import { CategoryVisual } from './category-visual';
import { FavoriteButton } from './favorite-button';

function compactReviewDate(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function ListingCard({ listing, compact = false }: { listing: DirectoryListing; compact?: boolean }) {
  const category = categoryById[listing.category];
  const phone = phoneHref(listing.phone);
  const image = latestScanImageForListing(listing) || imageForListing(listing);
  const reviewDate = compactReviewDate(listing.lastUpdatedAt);
  const hasRating = typeof listing.rating === 'number' && listing.reviewCount > 0;

  return (
    <article className={`listing-card listing-card--${listing.category}${compact ? ' listing-card--compact' : ''}`}>
      {listing.category !== 'emergency' && <FavoriteButton listingId={listing.id} variant="card" />}

      <Link href={`/listing/${listing.slug}`} className="listing-card__media" aria-label={`عرض ${listing.title}`}>
        <Image src={image.src} alt={image.alt} fill sizes={compact ? '(max-width: 620px) 100vw, 360px' : '(max-width: 620px) 100vw, (max-width: 1100px) 50vw, 360px'} />
        <span className="directory-media__shade" aria-hidden="true" />
        <span className="directory-media__label">{image.label}</span>
        <span className="listing-card__media-category">{category.shortLabel}</span>
      </Link>

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
        <h3>
          <Link href={`/listing/${listing.slug}`}>{listing.title}</Link>
        </h3>
        <p className="listing-card__location">{listing.location}</p>
      </div>

      <div className="listing-card__trust-row" aria-label="حالة مراجعة بيانات النشاط">
        {listing.sourceStatus === 'google_verified' && (
          <span className="listing-card__trust-chip listing-card__trust-chip--maps">مرجع خرائط Google</span>
        )}
        {listing.sourceStatus === 'cross_checked' && (
          <span className="listing-card__trust-chip listing-card__trust-chip--checked">تمت مطابقة البيانات</span>
        )}
        {hasRating && (
          <span className="listing-card__rating" aria-label={`تقييم ${listing.rating} من 5 بناءً على ${listing.reviewCount} مراجعة`}>
            <b aria-hidden="true">★</b>
            <strong>{listing.rating?.toFixed(1)}</strong>
            <span>({listing.reviewCount})</span>
          </span>
        )}
        {reviewDate && <time dateTime={listing.lastUpdatedAt}>مراجعة {reviewDate}</time>}
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
          <span className="sr-only">{listing.title}: </span>
          عرض التفاصيل
        </Link>
        {phone && (
          <a href={phone} className="button button--soft" aria-label={`اتصال بـ ${listing.title}`}>
            اتصال
          </a>
        )}
        {(listing.googlePlaceId || listing.googleMapsUrl) && (
          <a href={googleMapsHref(listing)} target="_blank" rel="noreferrer" className="button button--ghost" aria-label={`فتح موقع ${listing.title} على الخريطة`}>
            الخريطة
          </a>
        )}
      </div>

      <span className="listing-card__source">{sourceLabel(listing)}</span>
    </article>
  );
}