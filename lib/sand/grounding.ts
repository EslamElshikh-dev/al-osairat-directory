import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
import { queryCanonicalDirectory } from '@/lib/directory-repository';
import {
  canonicalizeDirectoryQuery,
  mergeDirectoryListings,
  queryDirectoryListings,
} from '@/lib/directory-query';
import { categories, categoryById, listings, villages } from '@/lib/data';
import { emergency } from '@/lib/data/emergency';
import type { DirectoryCategory, DirectoryListing } from '@/lib/types';
import { cleanGroundingValue } from './safety';
import type { SandGrounding, SandResult } from './types';

const MAX_RESULTS = 5;

const categoryAliases: Record<Exclude<DirectoryCategory, 'emergency'>, string[]> = {
  doctors: ['دكتور', 'دكتوره', 'طبيب', 'طبيبه', 'عياده', 'اطباء'],
  pharmacies: ['صيدليه', 'صيدليات', 'دواء'],
  shops: ['محل', 'محلات', 'سوبر ماركت', 'بقاله', 'متجر'],
  education: ['مدرسه', 'تعليم', 'مدرس', 'حضانة', 'حضانه', 'سنتر'],
  crafts: ['حرفي', 'سباك', 'كهربائي', 'نجار', 'نقاش', 'ميكانيكي', 'صنايعي'],
  restaurants: ['مطعم', 'مطاعم', 'اكل', 'كافيه'],
  lawyers: ['محامي', 'محام', 'محامين', 'مكتب محاماه'],
  clerics: ['شيخ', 'ماذون', 'مأذون', 'واعظ'],
  government: ['حكومي', 'وحده محليه', 'سجل مدني', 'مكتب بريد', 'تموين'],
  community: ['جمعيه', 'مجتمع', 'خدمه عامه', 'مبادره'],
  worship: ['مسجد', 'كنيسه', 'عباده'],
  transport: ['مواصلات', 'سياره', 'تاكسي', 'توك توك', 'نقل', 'سواق'],
};

const stopWords = new Set([
  'عايز', 'عاوزه', 'محتاج', 'محتاجه', 'ممكن', 'لو', 'سمحت', 'من', 'فضلك',
  'فين', 'اين', 'اقرب', 'قريب', 'قريبه', 'عندي', 'عندكم', 'دور', 'ابحث', 'لي',
  'عن', 'في', 'داخل', 'مركز', 'العسيرات', 'خدمه', 'مكان', 'واحد', 'حد', 'اللي',
]);

function includesPhrase(normalized: string, phrase: string) {
  const clean = canonicalizeDirectoryQuery(phrase);
  return clean ? ` ${normalized} `.includes(` ${clean} `) || normalized.includes(clean) : false;
}

function detectCategory(normalized: string) {
  for (const category of categories) {
    if (category.id === 'emergency') continue;
    const aliases = categoryAliases[category.id as Exclude<DirectoryCategory, 'emergency'>] || [];
    if ([category.label, category.shortLabel, ...aliases].some((label) => includesPhrase(normalized, label))) {
      return category.id;
    }
  }
  return undefined;
}

function detectVillage(normalized: string) {
  for (const village of villages) {
    if (includesPhrase(normalized, village.name)) return village.name;
    if (village.localities.some((locality) => includesPhrase(normalized, locality))) return village.name;
  }
  return undefined;
}

function extractFocusedQuery(normalized: string, category?: DirectoryCategory, village?: string) {
  const removed = new Set(stopWords);
  if (category && category !== 'emergency') {
    for (const alias of categoryAliases[category]) {
      for (const token of canonicalizeDirectoryQuery(alias).split(' ')) removed.add(token);
    }
  }
  if (village) {
    for (const token of canonicalizeDirectoryQuery(village).split(' ')) removed.add(token);
  }
  return normalized.split(' ').filter((token) => token && !removed.has(token)).join(' ').slice(0, 100);
}

function sourceLabel(listing: DirectoryListing) {
  if (listing.sourceStatus === 'google_verified') return 'موثق من Google Maps';
  if (listing.sourceStatus === 'cross_checked') return 'تمت مراجعته من أكثر من مصدر';
  if (listing.sourceStatus === 'needs_review') return 'قيد المراجعة';
  return 'مصدر محلي مسجل';
}

function toSandResult(listing: DirectoryListing): SandResult {
  return {
    id: listing.id,
    slug: listing.slug,
    title: cleanGroundingValue(listing.title, 120),
    category: listing.category,
    categoryLabel: cleanGroundingValue(categoryById[listing.category]?.shortLabel || 'خدمة', 50),
    village: cleanGroundingValue(listing.village, 80),
    location: cleanGroundingValue(listing.location, 160),
    description: cleanGroundingValue(listing.description, 220) || undefined,
    phone: cleanGroundingValue(listing.phone, 30) || undefined,
    whatsapp: cleanGroundingValue(listing.whatsapp, 30) || undefined,
    hours: cleanGroundingValue(listing.hours, 100) || undefined,
    href: `/listing/${encodeURIComponent(listing.slug)}`,
    sourceLabel: sourceLabel(listing),
    lastUpdatedAt: listing.lastUpdatedAt,
  };
}

export async function getSandDirectoryGrounding(message: string): Promise<SandGrounding> {
  const normalized = canonicalizeDirectoryQuery(message);
  const category = detectCategory(normalized);
  const village = detectVillage(normalized);
  const query = extractFocusedQuery(normalized, category, village);
  const options = {
    query: query || undefined,
    category,
    village,
    page: 1,
    pageSize: MAX_RESULTS,
    excludeEmergency: true,
  };

  const canonical = await queryCanonicalDirectory(options);
  if (canonical) {
    return {
      source: 'supabase',
      query,
      total: canonical.total,
      results: canonical.items.slice(0, MAX_RESULTS).map(toSandResult),
    };
  }

  const [published, overridden] = await Promise.all([
    getPublishedListings(),
    applyListingOverrides(listings),
  ]);
  const merged = mergeDirectoryListings(overridden, published);
  const local = queryDirectoryListings(merged, options);

  return {
    source: 'local_snapshot',
    query,
    total: local.total,
    results: local.items.slice(0, MAX_RESULTS).map(toSandResult),
  };
}

export function getSandEmergencyGrounding(): SandGrounding {
  return {
    source: 'static_emergency',
    query: 'طوارئ',
    total: emergency.length,
    results: emergency.map(toSandResult),
  };
}
