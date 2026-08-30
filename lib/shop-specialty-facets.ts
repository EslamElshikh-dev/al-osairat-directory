import type { DirectoryListing } from '@/lib/types';
import { normalizeDirectoryText } from '@/lib/directory-query';

export type ShopSpecialtyFacet = {
  label: string;
  query: string;
  count: number;
};

type FacetCounter = {
  count: number;
  fromSplitValue: boolean;
};

function splitStrongFacetValues(value: string) {
  const parts = value
    .split(/(?:،{2,}|[؛|])/u)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length ? parts : [value.trim()];
}

function canonicalizeShopFacet(value: string) {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  const normalized = normalizeDirectoryText(cleaned);

  if (!normalized) return '';

  if (normalized.includes('ادوات صحي') && normalized.includes('كهرب')) {
    return 'أدوات صحية وكهربائية';
  }

  if (normalized.includes('ادوات صحي') && normalized.includes('سباك')) {
    return 'أدوات صحية وسباكة';
  }

  if (normalized.includes('اجهزه') && normalized.includes('كهرب')) {
    return 'أجهزة كهربائية وإلكترونيات';
  }

  if (normalized.includes('غرف') && normalized.includes('نوم') && normalized.includes('اطفال')) {
    return 'غرف نوم أطفال';
  }

  if (normalized === 'ركنيات' || normalized === 'وركنيات') return 'ركنيات';
  if (normalized === 'مراتب') return 'مراتب';
  if (normalized === 'مطابخ') return 'مطابخ';
  if (normalized === 'ادوات صحيه') return 'أدوات صحية';

  return cleaned
    .replace(/^اجهزه\b/u, 'أجهزة')
    .replace(/^ادوات\b/u, 'أدوات')
    .replace(/\bاطفال\b/gu, 'أطفال')
    .replace(/\s+/g, ' ')
    .trim();
}

function queryForShopFacet(label: string) {
  // This broader phrase matches both the clean canonical value and the legacy
  // multi-specialty value that contains "اجهزه كهربائيه".
  if (label === 'أجهزة كهربائية وإلكترونيات') return 'أجهزة كهربائية';
  return label;
}

export function getShopSpecialtyFacets(listings: DirectoryListing[], limit = 12): ShopSpecialtyFacet[] {
  const counts = new Map<string, FacetCounter>();

  for (const listing of listings) {
    const rawValue = listing.subCategory?.trim();
    if (!rawValue) continue;

    const parts = splitStrongFacetValues(rawValue);
    const fromSplitValue = parts.length > 1;
    const perListing = new Set<string>();

    for (const part of parts) {
      const label = canonicalizeShopFacet(part);
      if (!label || perListing.has(label)) continue;

      // Keep the authority chips useful: long sentence-like legacy values belong
      // in the listing details/search index, not in the specialty navigation.
      if (!fromSplitValue && label.length > 42) continue;

      perListing.add(label);
      const current = counts.get(label) || { count: 0, fromSplitValue: false };
      counts.set(label, {
        count: current.count + 1,
        fromSplitValue: current.fromSplitValue || fromSplitValue,
      });
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => {
      const countDelta = b[1].count - a[1].count;
      if (countDelta) return countDelta;

      // If a legacy row contained several real specialties in one value,
      // surface the separated specialties before unrelated one-off labels.
      const splitDelta = Number(b[1].fromSplitValue) - Number(a[1].fromSplitValue);
      if (splitDelta) return splitDelta;

      return a[0].localeCompare(b[0], 'ar');
    })
    .slice(0, limit)
    .map(([label, data]) => ({
      label,
      query: queryForShopFacet(label),
      count: data.count,
    }));
}
