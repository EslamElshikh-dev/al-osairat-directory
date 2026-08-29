import type { DirectoryCategory, DirectoryListing } from './types';

export const DIRECTORY_PAGE_SIZE = 24;

const ARABIC_DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;
const NON_SEARCH_CHARS = /[^\p{L}\p{N}\s]/gu;

const synonymGroups = [
  ['دكتور', 'دكتوره', 'طبيب', 'طبيبه', 'د'],
  ['صيدليه', 'صيدليات'],
  ['سباك', 'سباكه'],
  ['كهربائي', 'كهرباء'],
  ['نجار', 'نجاره'],
  ['محامي', 'محام', 'محامين', 'محامون'],
  ['مطعم', 'مطاعم'],
  ['حرفي', 'حرفيين', 'حرفيون'],
  ['معمل', 'مختبر', 'تحاليل'],
  ['اطفال', 'طفل'],
];

const synonymMap = new Map<string, string>();
for (const group of synonymGroups) {
  const canonical = group[0];
  for (const token of group) synonymMap.set(token, canonical);
}

const displayReplacements: Array<[RegExp, string]> = [
  [/اخصائية/g, 'أخصائية'],
  [/اخصائي/g, 'أخصائي'],
  [/اسنشاري/g, 'استشاري'],
  [/صيدليه/g, 'صيدلية'],
  [/مستشفي/g, 'مستشفى'],
  [/اولاد حمزه/g, 'أولاد حمزة'],
  [/اولاد حمزة/g, 'أولاد حمزة'],
  [/امراض/g, 'أمراض'],
  [/الاعصاب/g, 'الأعصاب'],
];

function toAsciiDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

export function normalizeDirectoryText(value: string) {
  return toAsciiDigits(value)
    .normalize('NFC')
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ـ/g, '')
    .replace(NON_SEARCH_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canonicalizeDirectoryQuery(value: string) {
  return normalizeDirectoryText(value)
    .split(' ')
    .filter(Boolean)
    .map((token) => synonymMap.get(token) || token)
    .join(' ');
}

function editDistanceAtMostOne(a: string, b: string) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length < 4 || b.length < 4) return false;

  let i = 0;
  let j = 0;
  let edits = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }

  if (i < a.length || j < b.length) edits += 1;
  return edits <= 1;
}

function listingSearchText(listing: DirectoryListing) {
  return canonicalizeDirectoryQuery(
    [
      listing.title,
      listing.subCategory,
      listing.location,
      listing.village,
      listing.locality,
      listing.description,
      listing.phone,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

function matchesSearch(listing: DirectoryListing, query: string) {
  const normalizedQuery = canonicalizeDirectoryQuery(query);
  if (!normalizedQuery) return true;

  const haystack = listingSearchText(listing);
  if (haystack.includes(normalizedQuery)) return true;

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  const haystackTokens = haystack.split(' ').filter(Boolean);

  return queryTokens.every((queryToken) =>
    haystackTokens.some(
      (candidate) =>
        candidate.includes(queryToken) ||
        queryToken.includes(candidate) ||
        editDistanceAtMostOne(candidate, queryToken),
    ),
  );
}

function cleanDisplayText(value?: string) {
  if (!value) return undefined;
  let cleaned = toAsciiDigits(value).replace(/\s+/g, ' ').trim();
  for (const [pattern, replacement] of displayReplacements) cleaned = cleaned.replace(pattern, replacement);
  cleaned = cleaned
    .replace(/(^|\s)د\s*\/\s*/g, '$1د/ ')
    .replace(/دكتور\s*\/\s*/g, 'دكتور/ ')
    .replace(/\s+([،؛:.])/g, '$1');
  return cleaned || undefined;
}

function cleanPhone(value?: string) {
  const cleaned = cleanDisplayText(value);
  if (!cleaned) return undefined;
  const compact = cleaned.replace(/[^\d+]/g, '');
  return /^\+?\d{7,15}$/.test(compact) ? compact : cleaned;
}

function cleanHours(value: string | undefined, village: string) {
  const cleaned = cleanDisplayText(value);
  if (!cleaned) return undefined;

  const normalized = normalizeDirectoryText(cleaned);
  const normalizedVillage = normalizeDirectoryText(village);
  const hasTimeSignal = /(السبت|الاحد|الاثنين|الثلاثاء|الاربعاء|الخميس|الجمعه|يوميا|صباح|مساء|عصر|ظهر|ليلا|ساعه|مفتوح|مغلق|حتى|الي)/.test(normalized);

  // Some legacy rows accidentally stored a village/address fragment in the hours field.
  // Suppress only the clearly invalid pattern instead of guessing business hours.
  if (!hasTimeSignal && normalizedVillage && normalized.startsWith(normalizedVillage) && /\d/.test(normalized)) {
    return undefined;
  }

  return cleaned;
}

export function normalizeDirectoryListing(listing: DirectoryListing): DirectoryListing {
  const village = cleanDisplayText(listing.village) || listing.village;

  return {
    ...listing,
    title: cleanDisplayText(listing.title) || listing.title,
    subCategory: cleanDisplayText(listing.subCategory),
    location: cleanDisplayText(listing.location) || listing.location,
    village,
    locality: cleanDisplayText(listing.locality),
    hours: cleanHours(listing.hours, village),
    description: cleanDisplayText(listing.description),
    phone: cleanPhone(listing.phone),
    whatsapp: cleanPhone(listing.whatsapp),
  };
}

export function mergeDirectoryListings(baseListings: DirectoryListing[], extraListings: DirectoryListing[] = []) {
  const byId = new Map<string, DirectoryListing>();
  const slugToId = new Map<string, string>();

  for (const rawListing of [...baseListings, ...extraListings]) {
    const listing = normalizeDirectoryListing(rawListing);
    const previousIdForSlug = slugToId.get(listing.slug);
    if (previousIdForSlug && previousIdForSlug !== listing.id) byId.delete(previousIdForSlug);
    byId.set(listing.id, listing);
    slugToId.set(listing.slug, listing.id);
  }

  return Array.from(byId.values());
}

export interface DirectoryQueryOptions {
  category?: DirectoryCategory;
  village?: string;
  query?: string;
  page?: number;
  pageSize?: number;
  excludeEmergency?: boolean;
}

export interface DirectoryQueryResult {
  items: DirectoryListing[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  from: number;
  to: number;
}

export function queryDirectoryListings(
  allListings: DirectoryListing[],
  options: DirectoryQueryOptions = {},
): DirectoryQueryResult {
  const pageSize = Math.max(1, Math.min(options.pageSize || DIRECTORY_PAGE_SIZE, 60));
  const requestedPage = Number.isFinite(options.page) ? Math.max(1, Math.trunc(options.page || 1)) : 1;
  const normalizedVillage = options.village && options.village !== 'all' ? options.village : undefined;

  const filtered = allListings.filter((listing) => {
    if (options.excludeEmergency && listing.category === 'emergency') return false;
    if (options.category && listing.category !== options.category) return false;
    if (normalizedVillage && listing.village !== normalizedVillage) return false;
    if (options.query && !matchesSearch(listing, options.query)) return false;
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    total,
    page,
    totalPages,
    pageSize,
    from: total ? start + 1 : 0,
    to: total ? Math.min(start + pageSize, total) : 0,
  };
}

export function createDirectoryHref(
  pathname: string,
  params: {
    query?: string;
    village?: string;
    page?: number;
    vehicle?: string;
    destination?: string;
  },
) {
  const search = new URLSearchParams();
  if (params.query?.trim()) search.set('q', params.query.trim());
  if (params.village && params.village !== 'all') search.set('village', params.village);
  if (params.vehicle && params.vehicle !== 'all') search.set('vehicle', params.vehicle);
  if (params.destination && params.destination !== 'all') search.set('destination', params.destination);
  if (params.page && params.page > 1) search.set('page', String(params.page));
  const suffix = search.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}
