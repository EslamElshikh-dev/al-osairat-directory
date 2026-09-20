import type { DirectoryListing } from '@/lib/types';
import { normalizeDirectoryText } from '@/lib/directory-query';

export type LivingFreshness = {
  key: 'fresh' | 'recent' | 'aging' | 'unknown';
  label: string;
  detail: string;
  days: number | null;
};

export type LivingTrust = {
  key: 'verified' | 'checked' | 'published';
  label: string;
  detail: string;
};

function parseListingDate(value?: string) {
  if (!value) return null;
  const date = new Date(value + (value.length === 10 ? 'T00:00:00Z' : ''));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function listingFreshness(listing: DirectoryListing, now = new Date()): LivingFreshness {
  const updated = parseListingDate(listing.lastUpdatedAt);
  if (!updated) {
    return {
      key: 'unknown',
      label: 'تاريخ المراجعة غير متاح',
      detail: 'البيانات منشورة لكن لا يوجد تاريخ مراجعة واضح.',
      days: null,
    };
  }

  const days = Math.max(0, Math.floor((now.getTime() - updated.getTime()) / 86_400_000));
  if (days <= 30) {
    return {
      key: 'fresh',
      label: 'مراجَع حديثًا',
      detail: 'تمت مراجعة بيانات النشاط خلال آخر 30 يومًا.',
      days,
    };
  }
  if (days <= 90) {
    return {
      key: 'recent',
      label: 'مراجعة حديثة نسبيًا',
      detail: 'آخر مراجعة موثقة خلال آخر 3 أشهر.',
      days,
    };
  }
  return {
    key: 'aging',
    label: 'يحتاج مراجعة دورية',
    detail: 'مرّ أكثر من 3 أشهر على آخر تحديث موثق داخل الدليل.',
    days,
  };
}

export function listingTrust(listing: DirectoryListing): LivingTrust {
  if (listing.sourceStatus === 'google_verified') {
    return {
      key: 'verified',
      label: 'مرجع خرائط Google',
      detail: 'بيانات المكان مرتبطة بمرجع خرائط Google متاح.',
    };
  }
  if (listing.sourceStatus === 'cross_checked') {
    return {
      key: 'checked',
      label: 'تمت مطابقة البيانات',
      detail: 'تمت مراجعة البيانات مقابل أكثر من إشارة أو مصدر.',
    };
  }
  return {
    key: 'published',
    label: 'بيانات منشورة',
    detail: 'السجل منشور داخل الدليل ويظل قابلًا للتحديث والمراجعة.',
  };
}

export function formatLivingDate(value?: string) {
  if (!value) return '';
  const date = parseListingDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export type RelatedListingReason = {
  listing: DirectoryListing;
  score: number;
  reasons: string[];
};

function normalized(value?: string) {
  return normalizeDirectoryText(value || '');
}

export function relatedListingScore(source: DirectoryListing, candidate: DirectoryListing) {
  let score = 0;
  const reasons: string[] = [];

  if (candidate.category === source.category) {
    score += 70;
    reasons.push('نفس القسم');
  }
  if (candidate.village === source.village) {
    score += 45;
    reasons.push('نفس القرية');
  }

  const sourceSub = normalized(source.subCategory);
  const candidateSub = normalized(candidate.subCategory);
  if (sourceSub && candidateSub && sourceSub === candidateSub) {
    score += 45;
    reasons.unshift('نفس التخصص');
  }

  const sourceLocality = normalized(source.locality);
  const candidateLocality = normalized(candidate.locality);
  if (sourceLocality && candidateLocality && sourceLocality === candidateLocality) {
    score += 22;
    reasons.unshift('نفس النجع/التابع');
  }

  if (candidate.sourceStatus === 'google_verified') {
    score += 8;
    reasons.push('مرجع خرائط');
  } else if (candidate.sourceStatus === 'cross_checked') {
    score += 5;
    reasons.push('بيانات مطابقة');
  }

  if (candidate.phone) score += 2;
  if (candidate.googlePlaceId || candidate.googleMapsUrl) score += 2;

  return { score, reasons: [...new Set(reasons)].slice(0, 3) };
}

export function getLivingRelatedListings(
  listing: DirectoryListing,
  allListings: DirectoryListing[],
  limit = 4,
): RelatedListingReason[] {
  return allListings
    .filter((candidate) => candidate.id !== listing.id && candidate.category !== 'emergency')
    .map((candidate) => ({ candidate, ...relatedListingScore(listing, candidate) }))
    .filter(({ candidate, score }) =>
      score >= 45 && (candidate.category === listing.category || candidate.village === listing.village))
    .sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title, 'ar'))
    .slice(0, limit)
    .map(({ candidate, score, reasons }) => ({ listing: candidate, score, reasons }));
}

export function sortListingsByFreshness(items: DirectoryListing[], limit = 4) {
  return [...items]
    .filter((item) => parseListingDate(item.lastUpdatedAt))
    .sort((a, b) => Date.parse(b.lastUpdatedAt || '1970-01-01') - Date.parse(a.lastUpdatedAt || '1970-01-01'))
    .slice(0, limit);
}
