import type { DirectoryListing } from './data';

export const siteConfig = {
  name: 'دليل وموسوعة العسيرات',
  shortName: 'دليل العسيرات',
  description:
    'دليل رقمي شامل لمركز العسيرات وقراه بمحافظة سوهاج: أطباء وصيدليات ومحلات وحرفيون ومطاعم ومحامون وخدمات وأرقام مهمة.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://al-osairat-directory.vercel.app',
  locale: 'ar_EG',
};

export function normalizeArabic(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeRouteSlug(value: string) {
  let decoded = value;

  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // The value may already be decoded by the framework.
  }

  // Some hosting/runtime paths can surface UTF-8 Arabic bytes as Latin-1
  // mojibake (for example: Ø¬Ø²Ù...). Repair it without changing valid Arabic.
  if (/[ØÙÚÛ]/.test(decoded)) {
    try {
      const bytes = Uint8Array.from(Array.from(decoded, (char) => char.charCodeAt(0) & 0xff));
      const repaired = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (/[\u0600-\u06ff]/.test(repaired)) decoded = repaired;
    } catch {
      // Keep the original route value if repair is not valid UTF-8.
    }
  }

  return decoded.normalize('NFC');
}

export function phoneHref(phone?: string) {
  if (!phone || phone === '0') return undefined;
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function whatsappHref(listing: DirectoryListing) {
  const phone = listing.whatsapp || listing.phone;
  if (!phone || phone.length < 10 || phone === '0') return undefined;
  const normalized = phone.replace(/\D/g, '').replace(/^0/, '20');
  return `https://wa.me/${normalized}`;
}

export function googleMapsHref(listing: DirectoryListing) {
  if (listing.googleMapsUrl) return listing.googleMapsUrl;
  if (listing.googlePlaceId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.title)}&query_place_id=${listing.googlePlaceId}`;
  }
  const query = [listing.title, listing.location, 'سوهاج', 'مصر'].filter(Boolean).join('، ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function sourceLabel(listing: DirectoryListing) {
  if (listing.sourceStatus === 'google_verified') return 'بيانات خرائط Google';
  if (listing.sourceStatus === 'cross_checked') return 'تمت مطابقة البيانات';
  return 'بيانات الدليل المحلي';
}
