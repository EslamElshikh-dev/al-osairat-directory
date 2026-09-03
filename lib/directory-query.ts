import type { DirectoryCategory, DirectoryListing } from './types';

export const DIRECTORY_PAGE_SIZE = 24;

const ARABIC_DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;
const NON_SEARCH_CHARS = /[^\p{L}\p{N}\s]/gu;
const MIN_PARTIAL_TOKEN_LENGTH = 4;

const synonymGroups = [
  ['دكتور', 'دكتوره', 'طبيب', 'طبيبه', 'د'],
  ['صيدليه', 'صيدليات'],
  ['سباك', 'سباكه'],
  ['كهربائي', 'كهرباء'],
  ['نجار', 'نجاره'],
  ['محامي', 'محام', 'محامين', 'محامون'],
  ['مطعم', 'مطاعم'],
  ['حرفي', 'حرفيين', 'حرفيون'],
  ['معمل', 'معامل', 'مختبر', 'مختبرات', 'تحاليل'],
  ['حضانه', 'حضانات', 'روضه', 'روضات'],
  ['اسنان', 'dentist', 'dental'],
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

function normalizedField(value?: string) {
  return value ? canonicalizeDirectoryQuery(value) : '';
}

function meaningfulPartialMatch(candidate: string, queryToken: string) {
  if (candidate.length < MIN_PARTIAL_TOKEN_LENGTH || queryToken.length < MIN_PARTIAL_TOKEN_LENGTH) {
    return false;
  }
  return candidate.includes(queryToken) || queryToken.includes(candidate);
}

function tokenMatchRatio(value: string, queryTokens: string[]) {
  if (!value || !queryTokens.length) return 0;
  const fieldTokens = value.split(' ').filter(Boolean);
  const matched = queryTokens.filter((queryToken) =>
    fieldTokens.some(
      (candidate) =>
        candidate === queryToken
        || meaningfulPartialMatch(candidate, queryToken)
        || editDistanceAtMostOne(candidate, queryToken),
    ),
  ).length;
  return matched / queryTokens.length;
}

function fieldRelevance(value: string, normalizedQuery: string, queryTokens: string[], weight: number) {
  if (!value) return 0;
  if (value === normalizedQuery) return weight * 1.45;
  if (value.startsWith(`${normalizedQuery} `) || value.startsWith(normalizedQuery)) return weight * 1.25;
  if (value.includes(normalizedQuery)) return weight * 1.1;

  const ratio = tokenMatchRatio(value, queryTokens);
  if (ratio === 1) return weight * 0.9;
  if (ratio >= 0.5) return weight * 0.45 * ratio;
  return 0;
}

export function directorySearchRelevance(listing: DirectoryListing, query: string) {
  const normalizedQuery = canonicalizeDirectoryQuery(query);
  if (!normalizedQuery) return 0;
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  const title = normalizedField(listing.title);
  const subCategory = normalizedField(listing.subCategory);
  const description = normalizedField(listing.description);
  const village = normalizedField(listing.village);
  const locality = normalizedField(listing.locality);
  const location = normalizedField(listing.location);
  const phone = normalizedField(listing.phone);

  return (
    fieldRelevance(title, normalizedQuery, queryTokens, 120)
    + fieldRelevance(subCategory, normalizedQuery, queryTokens, 80)
    + fieldRelevance(description, normalizedQuery, queryTokens, 30)
    + fieldRelevance(village, normalizedQuery, queryTokens, 22)
    + fieldRelevance(locality, normalizedQuery, queryTokens, 18)
    + fieldRelevance(location, normalizedQuery, queryTokens, 8)
    + fieldRelevance(phone, normalizedQuery, queryTokens, 3)
  );
}

function matchesSearch(listing: DirectoryListing, query: string) {
  const normalizedQuery = canonicalizeDirectoryQuery(query);
  if (!normalizedQuery) return false;

  const queryTokens = Array.from(new Set(normalizedQuery.split(' ').filter(Boolean)));
  if (!queryTokens.length) return false;

  // For compound searches such as "حضانات جزيرة أولاد حمزة", require every
  // meaningful token to be present somewhere across the listing. This prevents
  // a village-only match from returning unrelated shops, hospitals or trades.
  if (queryTokens.length > 1) {
    const searchableCorpus = [
      listing.title,
      listing.subCategory,
      listing.description,
      listing.village,
      listing.locality,
      listing.location,
      listing.phone,
    ]
      .map((value) => normalizedField(value))
      .filter(Boolean)
      .join(' ');

    if (tokenMatchRatio(searchableCorpus, queryTokens) < 1) return false;
  }

  return directorySearchRelevance(listing, query) > 0;
}

function cleanDisplayText(value?: string) {
  if (!value) return undefined;
  let cleaned = toAsciiDigits(value)
    .replace(/\\\*\\\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

  if (options.query?.trim()) {
    const query = options.query;
    filtered.sort((a, b) => {
      const relevance = directorySearchRelevance(b, query) - directorySearchRelevance(a, query);
      if (relevance !== 0) return relevance;
      return a.title.localeCompare(b.title, 'ar');
    });
  }

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
