const ARABIC_DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;

function normalizeNavigationValue(value: string) {
  return value
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

export type SandNavigationAction = {
  label: string;
  href: string;
  aliases: string[];
};

export const sandNavigationActions: SandNavigationAction[] = [
  {
    label: 'أخبار العسيرات',
    href: '/news',
    aliases: ['أخبار العسيرات', 'اخبار العسيرات', 'الأخبار', 'الاخبار', 'افتح الأخبار', 'افتح اخبار العسيرات'],
  },
  {
    label: 'قرى العسيرات',
    href: '/villages',
    aliases: ['قرى العسيرات', 'القرى', 'افتح القرى', 'افتح قرى العسيرات'],
  },
  {
    label: 'نجوع العسيرات',
    href: '/localities',
    aliases: ['نجوع العسيرات', 'النجوع', 'افتح النجوع', 'افتح نجوع العسيرات'],
  },
  {
    label: 'خدمات الدليل',
    href: '/directory',
    aliases: ['خدمات الدليل', 'الدليل', 'افتح الدليل', 'استكشف الدليل'],
  },
  {
    label: 'وظائف سوهاج والعسيرات',
    href: '/jobs',
    aliases: ['وظائف سوهاج والعسيرات', 'وظائف العسيرات', 'الوظائف', 'شغل في سوهاج', 'فرص عمل في العسيرات', 'فرص عمل في سوهاج', 'افتح الوظائف'],
  },
  {
    label: 'اعرض فرصة عمل',
    href: '/jobs#participate',
    aliases: ['اعرض فرصة عمل', 'اعرض وظيفة', 'انشر وظيفة', 'شارك فرصة عمل', 'اعرض خبرتك', 'بدور على شغل'],
  },
  {
    label: 'نبض المجتمع',
    href: '/community',
    aliases: ['نبض المجتمع', 'المجتمع', 'افتح المجتمع'],
  },
  {
    label: 'مطور الدليل',
    href: '/developer',
    aliases: ['مطور الدليل', 'من مطور الدليل', 'حكاية مطور الدليل', 'مين عمل الدليل', 'تصميم الدليل'],
  },
  {
    label: 'مدونة العسيرات',
    href: '/blog',
    aliases: ['مدونة العسيرات', 'المدونة', 'افتح المدونة', 'افتح مدونة العسيرات'],
  },
];

const navigationAliasMap = new Map(
  sandNavigationActions.flatMap((action) =>
    action.aliases.map((alias) => [normalizeNavigationValue(alias), action.href] as const),
  ),
);

const contextResetAliases = new Set(
  [
    'محادثة جديدة',
    'ابدأ من جديد',
    'ابدأ بحث جديد',
    'بحث جديد',
    'امسح المحادثة',
    'امسح السياق',
    'صفر المحادثة',
  ].map(normalizeNavigationValue),
);

export function sandNavigationHref(value: string) {
  return navigationAliasMap.get(normalizeNavigationValue(value)) || '';
}

export function isSandContextResetCommand(value: string) {
  return contextResetAliases.has(normalizeNavigationValue(value));
}
