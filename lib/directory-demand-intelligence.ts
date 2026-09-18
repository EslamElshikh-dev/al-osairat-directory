import { categories, villages } from '@/lib/data';
import { canonicalizeDirectoryQuery, queryDirectoryListings } from '@/lib/directory-query';
import type { DirectoryCategory, DirectoryListing } from '@/lib/types';

export type SearchGapCandidate = {
  term: string;
  village: string;
  category: string;
  searches7d: number;
  searches30d: number;
  zeroResults7d: number;
  zeroResults30d: number;
  uniqueSessions30d: number;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type DemandGapRow = SearchGapCandidate & {
  targetVillage: string;
  targetCategory: DirectoryCategory | '';
  categoryLabel: string;
  currentResultCount: number;
  scopeListingCount: number;
  zeroRate30d: number;
  priority: number;
  priorityLabel: 'عاجلة' | 'مرتفعة' | 'متوسطة' | 'مراقبة';
  recommendedAction: string;
};

export type CollectionPlanRow = {
  key: string;
  village: string;
  category: DirectoryCategory | '';
  categoryLabel: string;
  terms: string[];
  zeroDemand30d: number;
  uniqueDemand30d: number;
  gapCount: number;
  coverageCount: number;
  priority: number;
};

const categoryRules: Array<{ category: DirectoryCategory; pattern: RegExp }> = [
  { category: 'doctors', pattern: /(دكتور|دكاتر|طبيب|اطباء|اسنان|تحاليل|معمل|مختبر|عياد|اطفال|اذن|حنجر|باطن|جلد|نساء|ولاد)/ },
  { category: 'pharmacies', pattern: /(صيدلي|دواء|ادويه|علاج|مستلزمات طبي)/ },
  { category: 'education', pattern: /(مدرس|تعليم|حضان|روض|معهد|سنتر|دروس|ازهر)/ },
  { category: 'transport', pattern: /(مواصل|نقل|سواق|سائق|ميكروباص|توك توك|تاكسي|اتوبيس|حافل)/ },
  { category: 'restaurants', pattern: /(مطعم|اكل|طعام|وجبات|كشري|مشويات|بيتزا|حلواني)/ },
  { category: 'crafts', pattern: /(سباك|كهربا|نجار|حداد|نقاش|صيانه|فني|حرفي|تشطيب)/ },
  { category: 'lawyers', pattern: /(محامي|محاماه|قانون|استشاره قانون)/ },
  { category: 'worship', pattern: /(مسجد|جامع|كنيس|عباده)/ },
  { category: 'clerics', pattern: /(ماذون|شيخ|زواج)/ },
  { category: 'government', pattern: /(بريد|وحده صحي|مجلس|حكوم|سجل مدني|شرطه)/ },
  { category: 'community', pattern: /(ديوان|مندر|جمعيه|عائله|مجلس عائلي)/ },
  { category: 'shops', pattern: /(محل|متجر|مكتبه|موبايل|ملابس|احذيه|بقال|سوبر ماركت|اثاث)/ },
];

function validCategory(value: string): DirectoryCategory | '' {
  if (value === 'all') return '';
  return categories.some((item) => item.id === value) ? value as DirectoryCategory : '';
}

function inferCategory(term: string, explicit: string) {
  const selected = validCategory(explicit);
  if (selected) return selected;
  const normalized = canonicalizeDirectoryQuery(term);
  return categoryRules.find((rule) => rule.pattern.test(normalized))?.category || '';
}

function inferVillage(term: string, explicit: string) {
  if (explicit && explicit !== 'all' && villages.some((item) => item.name === explicit)) return explicit;
  const normalized = canonicalizeDirectoryQuery(term);
  if (!normalized) return '';

  const direct = villages
    .filter((item) => item.name !== 'مركز العسيرات')
    .find((item) => normalized.includes(canonicalizeDirectoryQuery(item.name)));
  if (direct) return direct.name;

  for (const village of villages.filter((item) => item.name !== 'مركز العسيرات')) {
    if (village.localities.some((locality) => normalized.includes(canonicalizeDirectoryQuery(locality)))) {
      return village.name;
    }
  }
  return '';
}

function isNoiseTerm(term: string) {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return true;
  return ['admin', 'administrator', 'test', 'testing', 'asdf', 'qwerty'].includes(normalized);
}

function scopeCount(allListings: DirectoryListing[], village: string, category: DirectoryCategory | '') {
  return allListings.filter((listing) => {
    if (listing.category === 'emergency') return false;
    if (village && listing.village !== village) return false;
    if (category && listing.category !== category) return false;
    return true;
  }).length;
}

function scarcityPoints(count: number) {
  if (count === 0) return 20;
  if (count <= 2) return 17;
  if (count <= 5) return 13;
  if (count <= 10) return 7;
  return 0;
}

function recencyPoints(lastSeenAt: string, now: number) {
  const timestamp = Date.parse(lastSeenAt);
  if (!Number.isFinite(timestamp)) return 0;
  const days = Math.max(0, (now - timestamp) / 86_400_000);
  if (days <= 7) return 15;
  if (days <= 14) return 10;
  if (days <= 21) return 5;
  return 0;
}

function priorityLabel(priority: number): DemandGapRow['priorityLabel'] {
  if (priority >= 75) return 'عاجلة';
  if (priority >= 55) return 'مرتفعة';
  if (priority >= 35) return 'متوسطة';
  return 'مراقبة';
}

function actionLabel(village: string, categoryLabel: string, term: string) {
  if (village && categoryLabel) return `اجمع ${categoryLabel} في ${village} مع أولوية لعبارة «${term}»`;
  if (village) return `وسّع مسح الأنشطة في ${village} حول طلب «${term}»`;
  if (categoryLabel) return `وسّع تغطية ${categoryLabel} في العسيرات حول طلب «${term}»`;
  return `تحقق من طلب «${term}» وحدد القسم والقرية قبل بدء الجمع`;
}

export function buildDirectoryDemandIntelligence(
  candidates: SearchGapCandidate[],
  allListings: DirectoryListing[],
  now = Date.now(),
) {
  const evaluated = candidates
    .filter((candidate) => !isNoiseTerm(candidate.term))
    .map((candidate): DemandGapRow => {
      const targetCategory = inferCategory(candidate.term, candidate.category);
      const targetVillage = inferVillage(candidate.term, candidate.village);
      const categoryLabel = targetCategory
        ? categories.find((item) => item.id === targetCategory)?.shortLabel || targetCategory
        : '';
      const currentResultCount = queryDirectoryListings(allListings, {
        query: candidate.term,
        category: validCategory(candidate.category) || undefined,
        village: candidate.village && candidate.village !== 'all' ? candidate.village : undefined,
        page: 1,
      }).total;
      const coverage = scopeCount(allListings, targetVillage, targetCategory);
      const searches = Math.max(1, Number(candidate.searches30d || 0));
      const zero = Math.max(0, Number(candidate.zeroResults30d || 0));
      const zeroRate30d = Math.min(1, zero / searches);
      const demandPoints = Math.min(35, zero * 12 + Math.max(0, Number(candidate.uniqueSessions30d || 0) - 1) * 5);
      const specificityPoints = (targetVillage ? 5 : 0) + (targetCategory ? 5 : 0);
      const priority = Math.min(100, Math.round(
        demandPoints
        + zeroRate30d * 20
        + recencyPoints(candidate.lastSeenAt, now)
        + specificityPoints
        + scarcityPoints(coverage),
      ));

      return {
        ...candidate,
        targetVillage,
        targetCategory,
        categoryLabel,
        currentResultCount,
        scopeListingCount: coverage,
        zeroRate30d,
        priority,
        priorityLabel: priorityLabel(priority),
        recommendedAction: actionLabel(targetVillage, categoryLabel, candidate.term),
      };
    });

  const activeGaps = evaluated
    .filter((item) => item.currentResultCount === 0)
    .sort((a, b) =>
      b.priority - a.priority
      || b.zeroResults30d - a.zeroResults30d
      || b.uniqueSessions30d - a.uniqueSessions30d
      || Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt),
    );

  const resolvedGaps = evaluated
    .filter((item) => item.currentResultCount > 0)
    .sort((a, b) => b.zeroResults30d - a.zeroResults30d || b.currentResultCount - a.currentResultCount);

  const grouped = new Map<string, CollectionPlanRow>();
  for (const gap of activeGaps) {
    const village = gap.targetVillage || 'كل العسيرات';
    const categoryLabel = gap.categoryLabel || 'قسم يحتاج تحديد';
    const key = `${village}::${gap.targetCategory || 'unclassified'}`;
    const current = grouped.get(key) || {
      key,
      village,
      category: gap.targetCategory,
      categoryLabel,
      terms: [],
      zeroDemand30d: 0,
      uniqueDemand30d: 0,
      gapCount: 0,
      coverageCount: gap.scopeListingCount,
      priority: 0,
    };
    current.terms.push(gap.term);
    current.zeroDemand30d += gap.zeroResults30d;
    current.uniqueDemand30d += gap.uniqueSessions30d;
    current.gapCount += 1;
    current.coverageCount = Math.min(current.coverageCount, gap.scopeListingCount);
    current.priority = Math.max(current.priority, gap.priority);
    grouped.set(key, current);
  }

  const collectionPlan = Array.from(grouped.values())
    .map((item) => ({
      ...item,
      terms: Array.from(new Set(item.terms)).slice(0, 5),
      priority: Math.min(
        100,
        Math.round(item.priority * 0.7 + Math.min(20, item.zeroDemand30d * 6) + Math.min(10, item.gapCount * 3)),
      ),
    }))
    .sort((a, b) => b.priority - a.priority || b.zeroDemand30d - a.zeroDemand30d)
    .slice(0, 10);

  return {
    activeGaps: activeGaps.slice(0, 20),
    resolvedGaps: resolvedGaps.slice(0, 12),
    collectionPlan,
  };
}
