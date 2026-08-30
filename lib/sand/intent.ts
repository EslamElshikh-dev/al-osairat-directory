import type { DirectoryCategory } from '../types';

type SandDirectoryCategory = Exclude<DirectoryCategory, 'emergency'>;

type VillageLike = {
  name: string;
  localities?: string[];
};

type HistoryMessage = {
  role: 'user' | 'assistant';
  text: string;
};

type IntentAlias = {
  value: string;
  query?: string;
  weight?: number;
};

type CategoryIntent = {
  id: SandDirectoryCategory;
  label: string;
  aliases: IntentAlias[];
};

export type SandClarification = 'service' | 'village' | 'request';

export type SandRoutePlan = {
  intent: 'directory' | 'clarify' | 'unknown';
  normalized: string;
  category?: SandDirectoryCategory;
  categoryLabel?: string;
  village?: string;
  query: string;
  confidence: number;
  clarification?: SandClarification;
  resolvedFromHistory: boolean;
};

const ARABIC_DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;

const categoryIntents: CategoryIntent[] = [
  {
    id: 'doctors',
    label: 'طبيب أو خدمة طبية',
    aliases: [
      { value: 'دكتور' }, { value: 'دكتوره' }, { value: 'طبيب' }, { value: 'طبيبه' },
      { value: 'عياده' }, { value: 'عيادات' }, { value: 'اكشف' }, { value: 'يكشف' },
      { value: 'كشف' }, { value: 'معمل' }, { value: 'تحاليل' },
      { value: 'اسنان', query: 'اسنان', weight: 12 },
      { value: 'سناني', query: 'اسنان', weight: 12 },
      { value: 'ضرس', query: 'اسنان', weight: 12 },
      { value: 'عيون', query: 'عيون', weight: 12 },
      { value: 'نظري', query: 'عيون', weight: 12 },
      { value: 'باطنه', query: 'باطنه', weight: 12 },
      { value: 'بطني', query: 'باطنه', weight: 12 },
      { value: 'معدتي', query: 'باطنه', weight: 12 },
      { value: 'اطفال', query: 'اطفال', weight: 12 },
      { value: 'جلديه', query: 'جلديه', weight: 12 },
      { value: 'جلدي', query: 'جلديه', weight: 12 },
      { value: 'عظام', query: 'عظام', weight: 12 },
      { value: 'نسا', query: 'نساء وتوليد', weight: 12 },
      { value: 'ولاده', query: 'نساء وتوليد', weight: 12 },
      { value: 'انف واذن', query: 'انف واذن', weight: 16 },
      { value: 'مخ واعصاب', query: 'مخ واعصاب', weight: 16 },
      { value: 'قلب', query: 'قلب', weight: 12 },
    ],
  },
  {
    id: 'pharmacies',
    label: 'صيدلية',
    aliases: [
      { value: 'صيدليه' }, { value: 'صيدليات' }, { value: 'صيدلي' },
      { value: 'دوا' }, { value: 'دواء' }, { value: 'ادويه' }, { value: 'روشته' },
      { value: 'مستلزمات طبيه' },
    ],
  },
  {
    id: 'shops',
    label: 'محل أو نشاط تجاري',
    aliases: [
      { value: 'محل' }, { value: 'محلات' }, { value: 'متجر' }, { value: 'سوق' },
      { value: 'بقاله', query: 'بقاله', weight: 10 },
      { value: 'سوبر ماركت', query: 'سوبر ماركت', weight: 14 },
      { value: 'مكتبه', query: 'مكتبه', weight: 10 },
      { value: 'ملابس', query: 'ملابس', weight: 10 },
      { value: 'موبايلات', query: 'موبايلات', weight: 10 },
    ],
  },
  {
    id: 'education',
    label: 'مدرسة أو خدمة تعليمية',
    aliases: [
      { value: 'مدرسه' }, { value: 'مدارس' }, { value: 'تعليم' }, { value: 'مدرس' },
      { value: 'حضانة' }, { value: 'حضانه' }, { value: 'سنتر' }, { value: 'درس' },
      { value: 'ابتدائي', query: 'ابتدائي', weight: 10 },
      { value: 'اعدادي', query: 'اعدادي', weight: 10 },
      { value: 'ثانوي', query: 'ثانوي', weight: 10 },
    ],
  },
  {
    id: 'crafts',
    label: 'حِرفي أو خدمة صيانة',
    aliases: [
      { value: 'حرفي' }, { value: 'صنايعي' }, { value: 'تصليح' }, { value: 'صيانه' },
      { value: 'سباك', query: 'سباك', weight: 12 },
      { value: 'سباكه', query: 'سباك', weight: 12 },
      { value: 'حنفيه', query: 'سباك', weight: 12 },
      { value: 'ماسوره', query: 'سباك', weight: 12 },
      { value: 'تسريب', query: 'سباك', weight: 12 },
      { value: 'كهربائي', query: 'كهربائي', weight: 12 },
      { value: 'كهربا', query: 'كهربائي', weight: 12 },
      { value: 'كهرباء', query: 'كهربائي', weight: 12 },
      { value: 'النور قاطع', query: 'كهربائي', weight: 18 },
      { value: 'نجار', query: 'نجار', weight: 12 },
      { value: 'باب البيت', query: 'نجار', weight: 16 },
      { value: 'اثاث', query: 'نجار', weight: 12 },
      { value: 'ميكانيكي', query: 'ميكانيكي', weight: 12 },
      { value: 'العربيه عطلانه', query: 'ميكانيكي', weight: 20 },
      { value: 'نقاش', query: 'نقاش', weight: 12 },
      { value: 'دهان', query: 'نقاش', weight: 12 },
      { value: 'محاره', query: 'محاره', weight: 12 },
      { value: 'بنا', query: 'بنا', weight: 12 },
    ],
  },
  {
    id: 'restaurants',
    label: 'مطعم أو أكل',
    aliases: [
      { value: 'مطعم' }, { value: 'مطاعم' }, { value: 'اكل' }, { value: 'وجبه' },
      { value: 'كافيه', query: 'كافيه', weight: 10 },
      { value: 'قهوه', query: 'قهوه', weight: 10 },
      { value: 'مشويات', query: 'مشويات', weight: 10 },
      { value: 'حلواني', query: 'حلواني', weight: 10 },
    ],
  },
  {
    id: 'lawyers',
    label: 'محامٍ أو خدمة قانونية',
    aliases: [
      { value: 'محامي' }, { value: 'محام' }, { value: 'محامين' }, { value: 'قانوني' },
      { value: 'قضيه' }, { value: 'استشاره قانونيه' }, { value: 'مكتب محاماه' },
    ],
  },
  {
    id: 'clerics',
    label: 'مأذون أو شيخ',
    aliases: [
      { value: 'ماذون' }, { value: 'مأذون' }, { value: 'كتب كتاب' },
      { value: 'شيخ' }, { value: 'واعظ' },
    ],
  },
  {
    id: 'government',
    label: 'جهة أو خدمة حكومية',
    aliases: [
      { value: 'حكومي' }, { value: 'خدمه حكوميه' }, { value: 'وحده محليه' },
      { value: 'مكتب بريد', query: 'بريد', weight: 14 },
      { value: 'بريد', query: 'بريد', weight: 10 },
      { value: 'تموين', query: 'تموين', weight: 10 },
      { value: 'سجل مدني', query: 'سجل مدني', weight: 14 },
      { value: 'شهاده ميلاد', query: 'سجل مدني', weight: 16 },
      { value: 'مجلس المدينه' }, { value: 'مرافق' },
    ],
  },
  {
    id: 'community',
    label: 'ديوان أو خدمة مجتمعية',
    aliases: [
      { value: 'ديوان' }, { value: 'دواوين' }, { value: 'مندره' }, { value: 'منادر' },
      { value: 'جمعيه' }, { value: 'مبادره' }, { value: 'مجلس عائله' },
    ],
  },
  {
    id: 'worship',
    label: 'دار عبادة',
    aliases: [
      { value: 'مسجد' }, { value: 'جامع' }, { value: 'كنيسه' },
      { value: 'اصلي' }, { value: 'صلاه' }, { value: 'عباده' },
    ],
  },
  {
    id: 'transport',
    label: 'مواصلات أو وسيلة نقل',
    aliases: [
      { value: 'مواصلات' }, { value: 'نقل' }, { value: 'مشوار' }, { value: 'اروح' },
      { value: 'اوصل' }, { value: 'موقف' }, { value: 'ميكروباص' },
      { value: 'توك توك' }, { value: 'تاكسي' }, { value: 'سواق' },
      { value: 'قطار', query: 'قطار', weight: 10 },
      { value: 'اتوبيس', query: 'اتوبيس', weight: 10 },
      { value: 'عربيه' },
    ],
  },
];

const stopWords = new Set([
  'انا', 'احنا', 'عايز', 'عاوز', 'عاوزه', 'عاوزين', 'محتاج', 'محتاجه', 'ممكن',
  'لو', 'سمحت', 'من', 'فضلك', 'فين', 'اين', 'عندي', 'عندكم', 'دور', 'دورلي', 'ف',
  'ابحث', 'هات', 'لي', 'لنا', 'عن', 'في', 'داخل', 'مركز', 'العسيرات', 'خدمه',
  'مكان', 'واحد', 'حد', 'اللي', 'كده', 'بس', 'دلوقتي', 'ياريت', 'عايزه',
  'ساعدني', 'مساعده', 'السلام', 'عليكم', 'اهلا', 'مرحبا', 'طيب', 'طب', 'هو',
  'هي', 'ده', 'دي', 'هناك', 'هنا', 'عشان', 'علشان', 'موجود', 'موجوده', 'عليا',
  'عليه', 'عليها', 'اقرب', 'قريب', 'قريبه', 'جنبي', 'حواليا', 'حوالي', 'فيه',
]);

const symptomNoise = new Set([
  'تعبان', 'تعبانه', 'واجعني', 'واجعاني', 'بيوجعني', 'وجعاني', 'عطلان', 'عطلانه',
  'بايظ', 'بايظه', 'قاطع', 'بتسرب', 'يسرب', 'اصلحه', 'يصلحه', 'يصلحها', 'يشوفني',
  'اصرف', 'سريع', 'بسرعه',
]);

const proximitySignals = ['اقرب', 'قريب', 'قريبه', 'جنبي', 'حواليا', 'حوالي'];
const followUpSignals = ['طب', 'طيب', 'وفي', 'فيه غير', 'غير كده', 'غيرهم', 'هناك', 'نفسه'];
const directionalVillageTokens = new Set(['غرب', 'شرق', 'بحري', 'قبلي']);

function toAsciiDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

export function normalizeSandIntent(value: string) {
  return toAsciiDigits(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenVariants(token: string) {
  const values = new Set([token]);
  let clean = token;
  if (/^[وفبكل]/.test(clean) && clean.length > 4) {
    clean = clean.slice(1);
    values.add(clean);
  }
  if (clean.startsWith('ال') && clean.length > 4) values.add(clean.slice(2));
  return [...values];
}

function boundedEditDistance(a: string, b: string, max: number) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const value = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      current.push(value);
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return max + 1;
    previous = current;
  }
  return previous[b.length];
}

function tokenScore(input: string, candidate: string) {
  let best = 0;
  for (const left of tokenVariants(input)) {
    for (const right of tokenVariants(candidate)) {
      if (left === right) best = Math.max(best, 100);
      const shorter = Math.min(left.length, right.length);
      const longer = Math.max(left.length, right.length);
      if (shorter >= 3 && (left.startsWith(right) || right.startsWith(left)) && shorter / longer >= 0.6) {
        best = Math.max(best, 78);
      }
      if (shorter >= 3 && boundedEditDistance(left, right, 1) <= 1) best = Math.max(best, 68);
      if (shorter >= 7 && boundedEditDistance(left, right, 2) <= 2) best = Math.max(best, 56);
    }
  }
  return best;
}

function phraseScore(normalized: string, phrase: string) {
  const clean = normalizeSandIntent(phrase);
  if (!clean) return 0;
  if (` ${normalized} `.includes(` ${clean} `)) return 120 + clean.split(' ').length * 4;

  const inputTokens = normalized.split(' ').filter(Boolean);
  const phraseTokens = clean.split(' ').filter(Boolean);
  const scores = phraseTokens.map((candidate) =>
    inputTokens.reduce((best, input) => Math.max(best, tokenScore(input, candidate)), 0),
  );
  const strong = scores.filter((score) => score >= 68).length;
  const ratio = strong / phraseTokens.length;
  if (phraseTokens.length === 1) return scores[0] || 0;
  if (ratio < 0.66) return 0;
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / phraseTokens.length) * ratio);
}

function detectCategory(normalized: string) {
  const matches = categoryIntents
    .map((intent) => intent.aliases.reduce<{
      intent: CategoryIntent;
      alias: IntentAlias;
      score: number;
    } | undefined>((best, alias) => {
      const score = phraseScore(normalized, alias.value) + (alias.weight || 0);
      return !best || score > best.score ? { intent, alias, score } : best;
    }, undefined))
    .filter((match): match is NonNullable<typeof match> => Boolean(match))
    .sort((left, right) => right.score - left.score);

  const winner = matches[0];
  if (!winner || winner.score < 58) return undefined;
  return { ...winner, ambiguous: Boolean(matches[1] && matches[1].score >= winner.score - 5) };
}

function detectVillage(normalized: string, villages: VillageLike[]) {
  const officialTokens = new Set(
    villages.flatMap((village) => normalizeSandIntent(village.name).split(' ').filter(Boolean)),
  );
  let winner: { name: string; phrase: string; score: number } | undefined;

  for (const village of villages) {
    const candidates = [village.name, ...(village.localities || [])];
    for (const [index, candidate] of candidates.entries()) {
      const clean = normalizeSandIntent(candidate);
      if (!clean) continue;
      if (index > 0 && !clean.includes(' ') && officialTokens.has(clean)) continue;
      const relaxedOfficial = index === 0
        ? clean.split(' ').filter((token) => !directionalVillageTokens.has(token)).join(' ')
        : '';
      const score = Math.max(
        phraseScore(normalized, candidate),
        relaxedOfficial && relaxedOfficial !== clean ? phraseScore(normalized, relaxedOfficial) - 4 : 0,
      ) + (index === 0 ? 12 : 0);
      if (score > (winner?.score || 0)) winner = { name: village.name, phrase: candidate, score };
    }
  }

  return winner && winner.score >= 66 ? winner : undefined;
}

function isNoiseToken(token: string) {
  return tokenVariants(token).some((variant) => stopWords.has(variant) || symptomNoise.has(variant));
}

function tokenBelongsToPhrases(token: string, phrases: string[]) {
  return phrases.some((phrase) =>
    normalizeSandIntent(phrase).split(' ').some((candidate) => tokenScore(token, candidate) >= 68),
  );
}

function singleMessagePlan(message: string, villages: VillageLike[]) {
  const normalized = normalizeSandIntent(message);
  const categoryMatch = detectCategory(normalized);
  const villageMatch = detectVillage(normalized, villages);
  const matchedCategoryAliases = categoryMatch
    ? categoryMatch.intent.aliases
      .filter((alias) => phraseScore(normalized, alias.value) >= 68)
      .map((alias) => alias.value)
    : [];
  const villagePhrases = villageMatch
    ? villages
      .filter((village) => village.name === villageMatch.name)
      .flatMap((village) => {
        const cleanName = normalizeSandIntent(village.name);
        const relaxedName = cleanName.split(' ').filter((token) => !directionalVillageTokens.has(token)).join(' ');
        return [village.name, relaxedName, ...(village.localities || [])];
      })
      .filter((phrase) => phraseScore(normalized, phrase) >= 66)
    : [];

  const residual = normalized
    .split(' ')
    .filter(Boolean)
    .filter((token) => !isNoiseToken(token))
    .filter((token) => !tokenBelongsToPhrases(token, matchedCategoryAliases))
    .filter((token) => !tokenBelongsToPhrases(token, villagePhrases));

  const query = (residual.join(' ') || categoryMatch?.alias.query || '').slice(0, 100);
  return {
    normalized,
    category: categoryMatch?.intent.id,
    categoryLabel: categoryMatch?.intent.label,
    categoryScore: categoryMatch?.score || 0,
    categoryAmbiguous: categoryMatch?.ambiguous || false,
    village: villageMatch?.name,
    villageScore: villageMatch?.score || 0,
    query,
  };
}

function hasAnySignal(normalized: string, signals: string[]) {
  return signals.some((signal) => phraseScore(normalized, signal) >= 78);
}

export function planSandRequest(
  message: string,
  history: HistoryMessage[] = [],
  villages: VillageLike[] = [],
): SandRoutePlan {
  const current = singleMessagePlan(message, villages);
  const previousPlans = history
    .filter((item) => item.role === 'user')
    .slice(-3)
    .reverse()
    .map((item) => singleMessagePlan(item.text, villages));
  const previous = previousPlans.find((plan) => plan.category || plan.village || plan.query);
  const shortOrFollowUp = current.normalized.split(' ').length <= 8
    || hasAnySignal(current.normalized, followUpSignals);

  let category = current.category;
  let categoryLabel = current.categoryLabel;
  let village = current.village;
  let query = current.query;
  let resolvedFromHistory = false;

  if (previous && shortOrFollowUp) {
    if (!category && previous.category) {
      category = previous.category;
      categoryLabel = previous.categoryLabel;
      resolvedFromHistory = true;
    }
    if (!village && previous.village) {
      village = previous.village;
      resolvedFromHistory = true;
    }
    if (!query && previous.query && (!current.category || current.category === previous.category)) {
      query = previous.query;
      resolvedFromHistory = true;
    }
  }

  const asksForNearby = hasAnySignal(current.normalized, proximitySignals);
  let clarification: SandClarification | undefined;
  if (!category && !query && village) clarification = 'service';
  else if (!category && !query) clarification = 'request';
  else if (asksForNearby && !village) clarification = 'village';

  const confidenceParts = [
    category ? Math.min(1, (current.categoryScore || 72) / 120) : 0,
    village ? Math.min(1, (current.villageScore || 72) / 120) : 0,
    query ? 0.72 : 0,
  ].filter((value) => value > 0);
  let confidence = confidenceParts.length
    ? confidenceParts.reduce((sum, value) => sum + value, 0) / confidenceParts.length
    : 0;
  if (current.categoryAmbiguous) confidence = Math.min(confidence, 0.58);
  if (resolvedFromHistory) confidence = Math.max(confidence, 0.74);

  return {
    intent: clarification ? 'clarify' : category || query ? 'directory' : 'unknown',
    normalized: current.normalized,
    category,
    categoryLabel,
    village,
    query,
    confidence: Number(confidence.toFixed(2)),
    clarification,
    resolvedFromHistory,
  };
}
