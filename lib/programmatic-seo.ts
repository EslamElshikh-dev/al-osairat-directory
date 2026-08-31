import type { CategoryInfo, DirectoryCategory, DirectoryListing, VillageInfo } from '@/lib/types';
import { categories, villages } from '@/lib/data/base';
import { normalizeDirectoryText } from '@/lib/directory-query';
import { isListingIndexable, listingDataQualityScore } from '@/lib/seo-growth';

export type ServiceIntentId = 'electrician' | 'plumber' | 'libraries';

export type ServiceIntent = {
  id: ServiceIntentId;
  label: string;
  singularLabel: string;
  primaryQuery: string;
  title: string;
  description: string;
  category: DirectoryCategory;
  matchTokens: string[];
  relatedQueries: string[];
  intro: string;
  guidance: string;
};

export type VillageCategoryLanding = {
  village: VillageInfo;
  category: CategoryInfo;
  listings: DirectoryListing[];
  averageQuality: number;
};

export type CategorySearchProfile = {
  title: string;
  heading: string;
  description: string;
  primaryQuery: string;
  supportingTerms: string[];
  editorial: string;
};

export const PROGRAMMATIC_MIN_LISTINGS = 3;
export const PROGRAMMATIC_MIN_AVERAGE_QUALITY = 62;

const LOCAL_LANDING_CATEGORIES = new Set<DirectoryCategory>([
  'doctors',
  'pharmacies',
  'shops',
  'education',
  'crafts',
  'restaurants',
  'lawyers',
  'government',
]);

export const serviceIntents: ServiceIntent[] = [
  {
    id: 'electrician',
    label: 'كهربائي في العسيرات',
    singularLabel: 'كهربائي',
    primaryQuery: 'كهربائي في العسيرات',
    title: 'كهربائي في العسيرات - فني كهرباء وخدمات منزلية',
    description: 'دليل فنيي الكهرباء وخدمات الأعطال والتركيب والأعمال الكهربائية المنشورة داخل مركز العسيرات وقراه.',
    category: 'crafts',
    matchTokens: ['كهربائي', 'كهرباء'],
    relatedQueries: ['فني كهرباء في العسيرات', 'كهربائي منازل في العسيرات', 'أعمال كهرباء في العسيرات'],
    intro: 'تجمع هذه الصفحة السجلات التي يوضح تخصصها المنشور العمل في الكهرباء أو تنفيذ أعمال كهربائية، مع إبقاء بيانات الاتصال والموقع كما وردت في الدليل من دون ادعاء ترتيب أو أفضلية.',
    guidance: 'قارن بين نطاق الخدمة والقرية وبيانات التواصل، ثم تواصل مباشرة مع مقدم الخدمة للتأكد من نوع العمل المطلوب والموعد والتكلفة قبل الاتفاق.',
  },
  {
    id: 'plumber',
    label: 'سباك في العسيرات',
    singularLabel: 'سباك',
    primaryQuery: 'سباك في العسيرات',
    title: 'سباك في العسيرات - سباكة وصيانة وتأسيس',
    description: 'دليل السباكين وخدمات السباكة والتأسيس والصيانة المنشورة داخل مركز العسيرات وقراه.',
    category: 'crafts',
    matchTokens: ['سباك', 'سباكه'],
    relatedQueries: ['سباك صحي في العسيرات', 'سباكة في العسيرات', 'فني سباكة في العسيرات'],
    intro: 'تجمع الصفحة السجلات التي يذكر تخصصها المنشور السباكة أو أعمالها بشكل مباشر، لتسهيل الوصول إلى مقدم خدمة محلي بحسب القرية وبيانات التواصل المتاحة.',
    guidance: 'تحقق من نطاق العمل المطلوب مثل التأسيس أو الصيانة أو الإصلاح، واطلب تفاصيل التنفيذ والتكلفة من مقدم الخدمة مباشرة قبل بدء العمل.',
  },
  {
    id: 'libraries',
    label: 'مكتبات في العسيرات',
    singularLabel: 'مكتبة',
    primaryQuery: 'مكتبة في العسيرات',
    title: 'مكتبات في العسيرات - مكتبات وخدمات محلية',
    description: 'مكتبات وأنشطة تحمل تخصص المكتبات ضمن السجلات المنشورة في مركز العسيرات وقراه.',
    category: 'shops',
    matchTokens: ['مكتبه', 'مكتبات'],
    relatedQueries: ['مكتبة في العسيرات', 'مكتبات العسيرات', 'مكتبة قريبة في العسيرات'],
    intro: 'ظهرت «مكتبة» كإشارة بحث داخلية فعلية في الدليل، لذلك خُصصت هذه الصفحة لتجميع السجلات المطابقة فقط بدل إنشاء صفحة عامة مكررة لقسم المحلات.',
    guidance: 'راجع موقع المكتبة وبيانات التواصل المتاحة في السجل قبل الزيارة؛ فقد تتغير المنتجات وساعات العمل، ولا يفترض الدليل توافر منتج بعينه.',
  },
];

export const categorySearchProfiles: Partial<Record<DirectoryCategory, CategorySearchProfile>> = {
  doctors: {
    title: 'أطباء وعيادات في العسيرات',
    heading: 'أطباء وعيادات في العسيرات',
    description: 'دليل الأطباء والعيادات والمعامل والخدمات الطبية المنشورة داخل مركز العسيرات وقراه بمحافظة سوهاج.',
    primaryQuery: 'أطباء في العسيرات',
    supportingTerms: ['دكاترة العسيرات', 'عيادات في العسيرات', 'خدمات طبية في العسيرات'],
    editorial: 'هذه هي الصفحة الأساسية للأطباء والخدمات الطبية في العسيرات؛ تُجمع فيها السجلات المنشورة وتُربط بصفحات القرى بدل إنشاء صفحات مكررة لكل صيغة بحث متقاربة.',
  },
  pharmacies: {
    title: 'صيدليات في العسيرات',
    heading: 'صيدليات في العسيرات',
    description: 'دليل الصيدليات والمستلزمات الطبية المنشورة داخل مركز العسيرات وقراه مع بيانات الاتصال والموقع المتاحة.',
    primaryQuery: 'صيدليات في العسيرات',
    supportingTerms: ['صيدلية في العسيرات', 'صيدليات العسيرات', 'مستلزمات طبية في العسيرات'],
    editorial: 'تعرض الصفحة الصيدليات والمستلزمات الطبية باعتبارها صفحة القسم الأساسية، مع روابط محلية للقرى التي توجد بها سجلات فعلية داخل الدليل.',
  },
  shops: {
    title: 'محلات وأسواق في العسيرات',
    heading: 'محلات وأسواق في العسيرات',
    description: 'دليل المحلات والأسواق والأنشطة التجارية والخدمات اليومية المنشورة في مركز العسيرات وقراه.',
    primaryQuery: 'محلات في العسيرات',
    supportingTerms: ['أسواق العسيرات', 'متاجر في العسيرات', 'أنشطة تجارية في العسيرات'],
    editorial: 'تغطي الصفحة المحلات والأنشطة التجارية بمختلف تخصصاتها، بينما تحصل التخصصات التي يظهر عليها طلب واضح وتتوافر لها بيانات كافية، مثل المكتبات، على صفحة مستقلة.',
  },
  education: {
    title: 'مدارس وتعليم في العسيرات',
    heading: 'مدارس وتعليم في العسيرات',
    description: 'دليل المدارس والمؤسسات والخدمات التعليمية المنشورة داخل مركز العسيرات وقراه بمحافظة سوهاج.',
    primaryQuery: 'مدارس في العسيرات',
    supportingTerms: ['مدارس العسيرات', 'التعليم في العسيرات', 'مدرسة في العسيرات'],
    editorial: 'تجمع الصفحة المدارس والمؤسسات التعليمية المسجلة داخل نطاق العسيرات، وتربط كل سجل بصفحته المحلية والقرية المرتبط بها عندما تكون البيانات متاحة.',
  },
  crafts: {
    title: 'حرفيون وخدمات فنية في العسيرات',
    heading: 'حرفيون وخدمات فنية في العسيرات',
    description: 'دليل الحرفيين والخدمات الفنية في العسيرات مثل السباكة والكهرباء والتشطيبات والصيانة والخدمات المنزلية.',
    primaryQuery: 'حرفيون في العسيرات',
    supportingTerms: ['كهربائي في العسيرات', 'سباك في العسيرات', 'خدمات فنية في العسيرات'],
    editorial: 'هذه صفحة التجميع الأساسية للخدمات الفنية، وتُخصَّص صفحات مستقلة لعمليات البحث الأدق، مثل «كهربائي» و«سباك»، عندما تتجاوز البيانات حد العدد والجودة المطلوب.',
  },
};

const categoryById = Object.fromEntries(categories.map((category) => [category.id, category])) as Record<DirectoryCategory, CategoryInfo>;
const villageByName = Object.fromEntries(villages.map((village) => [village.name, village])) as Record<string, VillageInfo>;

function uniqueListings(listings: DirectoryListing[]) {
  return Array.from(new Map(listings.map((listing) => [listing.id, listing])).values());
}

function stableListings(listings: DirectoryListing[]) {
  return uniqueListings(listings).filter((listing) => listing.sourceStatus !== 'needs_review');
}

function listingIntentTokens(listing: DirectoryListing) {
  return new Set(
    normalizeDirectoryText([listing.title, listing.subCategory].filter(Boolean).join(' '))
      .split(' ')
      .filter(Boolean),
  );
}

function averageQuality(listings: DirectoryListing[]) {
  if (!listings.length) return 0;
  return Math.round(listings.reduce((sum, listing) => sum + listingDataQualityScore(listing), 0) / listings.length);
}

function contactableCount(listings: DirectoryListing[]) {
  return listings.filter((listing) => Boolean(listing.phone || listing.whatsapp || listing.googleMapsUrl || listing.googlePlaceId)).length;
}

function indexableCount(listings: DirectoryListing[]) {
  return listings.filter(isListingIndexable).length;
}

export function isProgrammaticCollectionEligible(listings: DirectoryListing[], minListings = PROGRAMMATIC_MIN_LISTINGS) {
  const stable = stableListings(listings);
  if (stable.length < minListings) return false;
  if (averageQuality(stable) < PROGRAMMATIC_MIN_AVERAGE_QUALITY) return false;
  const minimumUsefulRecords = Math.min(2, stable.length);
  return contactableCount(stable) >= minimumUsefulRecords
    && indexableCount(stable) >= minimumUsefulRecords;
}

export function isVillageHubIndexable(allListings: DirectoryListing[], villageName: string) {
  if (villageName === 'مركز العسيرات') return false;
  return stableListings(
    allListings.filter((listing) => listing.village === villageName && listing.category !== 'emergency'),
  ).some(isListingIndexable);
}

export function getServiceIntentById(id: string) {
  return serviceIntents.find((intent) => intent.id === id);
}

export function getServiceIntentListings(allListings: DirectoryListing[], intent: ServiceIntent) {
  const normalizedMatchTokens = new Set(intent.matchTokens.map((token) => normalizeDirectoryText(token)));
  const matches = allListings.filter((listing) => {
    if (listing.category !== intent.category || listing.sourceStatus === 'needs_review') return false;
    const tokens = listingIntentTokens(listing);
    return Array.from(normalizedMatchTokens).some((token) => tokens.has(token));
  });

  return stableListings(matches).sort((a, b) => {
    const qualityDelta = listingDataQualityScore(b) - listingDataQualityScore(a);
    return qualityDelta || a.title.localeCompare(b.title, 'ar');
  });
}

export function getEligibleServiceIntents(allListings: DirectoryListing[]) {
  return serviceIntents
    .map((intent) => ({ intent, listings: getServiceIntentListings(allListings, intent) }))
    .filter(({ listings }) => isProgrammaticCollectionEligible(listings));
}

export function villageCategoryLandingPath(village: VillageInfo, category: CategoryInfo | DirectoryCategory) {
  const categoryId = typeof category === 'string' ? category : category.id;
  return `/villages/${encodeURIComponent(village.slug)}/${categoryId}`;
}

export function getVillageCategoryListings(allListings: DirectoryListing[], villageName: string, category: DirectoryCategory) {
  return stableListings(
    allListings.filter((listing) => listing.village === villageName && listing.category === category && listing.category !== 'emergency'),
  ).sort((a, b) => {
    const qualityDelta = listingDataQualityScore(b) - listingDataQualityScore(a);
    return qualityDelta || a.title.localeCompare(b.title, 'ar');
  });
}

export function isVillageCategoryLandingEligible(allListings: DirectoryListing[], villageName: string, category: DirectoryCategory) {
  if (!LOCAL_LANDING_CATEGORIES.has(category) || villageName === 'مركز العسيرات') return false;
  return isProgrammaticCollectionEligible(getVillageCategoryListings(allListings, villageName, category));
}

export function getEligibleVillageCategoryLandings(allListings: DirectoryListing[]): VillageCategoryLanding[] {
  const output: VillageCategoryLanding[] = [];

  for (const village of villages) {
    if (village.name === 'مركز العسيرات') continue;
    for (const categoryId of LOCAL_LANDING_CATEGORIES) {
      const listings = getVillageCategoryListings(allListings, village.name, categoryId);
      if (!isProgrammaticCollectionEligible(listings)) continue;
      output.push({
        village,
        category: categoryById[categoryId],
        listings,
        averageQuality: averageQuality(listings),
      });
    }
  }

  return output.sort((a, b) => b.listings.length - a.listings.length || b.averageQuality - a.averageQuality);
}

export function getTopSubCategories(listings: DirectoryListing[], limit = 6) {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    const label = listing.subCategory?.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ar'))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export function getProgrammaticCollectionStats(listings: DirectoryListing[]) {
  const stable = stableListings(listings);
  return {
    total: stable.length,
    averageQuality: averageQuality(stable),
    contactable: contactableCount(stable),
    indexable: indexableCount(stable),
    withMaps: stable.filter((listing) => Boolean(listing.googleMapsUrl || listing.googlePlaceId)).length,
    villages: new Set(stable.map((listing) => listing.village)).size,
  };
}

export function resolveVillageAndCategory(villageSlug: string, categoryId: string) {
  const village = villages.find((item) => item.slug === villageSlug);
  const category = categoryById[categoryId as DirectoryCategory];
  if (!village || !category) return null;
  return { village, category };
}

export function villageForListing(listing: DirectoryListing) {
  return villageByName[listing.village];
}
