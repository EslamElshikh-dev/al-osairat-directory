import { normalizeSandIntent } from './intent';

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
    label: 'مدونة العسيرات',
    href: '/blog',
    aliases: ['مدونة العسيرات', 'المدونة', 'افتح المدونة', 'افتح مدونة العسيرات'],
  },
];

const navigationAliasMap = new Map(
  sandNavigationActions.flatMap((action) =>
    action.aliases.map((alias) => [normalizeSandIntent(alias), action.href] as const),
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
  ].map(normalizeSandIntent),
);

export function sandNavigationHref(value: string) {
  return navigationAliasMap.get(normalizeSandIntent(value)) || '';
}

export function isSandContextResetCommand(value: string) {
  return contextResetAliases.has(normalizeSandIntent(value));
}
