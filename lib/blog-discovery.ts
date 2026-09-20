export type BlogDiscoveryTopic = 'all' | 'place' | 'history' | 'people' | 'families';

export const blogDiscoveryTopics: Array<{ value: BlogDiscoveryTopic; label: string; hint: string }> = [
  { value: 'all', label: 'الكل', hint: 'كل ملفات الموسوعة' },
  { value: 'place', label: 'المكان والخدمات', hint: 'المركز والمعالم والخدمات' },
  { value: 'history', label: 'التاريخ والأسماء', hint: 'أصل الاسم والتحولات التاريخية' },
  { value: 'people', label: 'الأعلام والشخصيات', hint: 'أسماء وسير مرتبطة بالعسيرات' },
  { value: 'families', label: 'العائلات', hint: 'البيوت والعائلات ودرجة التوثيق' },
];

const articleTopicBySlug: Record<string, Exclude<BlogDiscoveryTopic, 'all'>> = {
  'markaz-al-osairat': 'place',
  'al-osairat-landmarks': 'place',
  'origin-name-al-osairat': 'history',
  'al-osairat-famous-people': 'people',
  'famous-families-al-osairat': 'families',
};

export function getBlogDiscoveryTopic(slug: string): Exclude<BlogDiscoveryTopic, 'all'> {
  return articleTopicBySlug[slug] ?? 'place';
}

export function normalizeBlogSearchText(value: string) {
  return value
    .toLocaleLowerCase('ar-EG')
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}
