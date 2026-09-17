import type { DirectoryListing } from '../types';

const maps = (query: string, placeId?: string) => {
  const params = new URLSearchParams({ api: '1', query });
  if (placeId) params.set('query_place_id', placeId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
};

export const awladBahigLocalitiesScan20260917: DirectoryListing[] = [
  {
    id: 'education-مدرسة-نجع-رشوان-الاعدادية-اولاد-بهيج',
    slug: 'مدرسة-نجع-رشوان-الاعدادية-اولاد-بهيج',
    title: 'مدرسة نجع رشوان الإعدادية',
    category: 'education',
    subCategory: 'مدرسة إعدادية حكومية',
    location: 'نجع رشوان، أولاد بهيج، مركز العسيرات، محافظة سوهاج',
    village: 'أولاد بهيج',
    locality: 'رشوان',
    description: 'مدرسة إعدادية بنجع رشوان ضمن نطاق أولاد بهيج. تظهر مستقلة في نتائج الشهادة الإعدادية بمحافظة سوهاج لعام 2026، مع 101 طالب في الفصل الدراسي الثاني.',
    reviewCount: 0,
    source: 'user_collected',
    sourceStatus: 'cross_checked',
    lastUpdatedAt: '2026-09-17',
  },
  {
    id: 'government-مكتب-بريد-نجع-رشوان-اولاد-بهيج',
    slug: 'مكتب-بريد-نجع-رشوان-اولاد-بهيج',
    title: 'مكتب بريد نجع رشوان',
    category: 'government',
    subCategory: 'مكتب بريد',
    location: 'طريق السلام، نجع رشوان، أولاد بهيج، مركز العسيرات، محافظة سوهاج',
    village: 'أولاد بهيج',
    locality: 'رشوان',
    hours: 'الأحد إلى الخميس من 8:00 صباحًا إلى 3:00 مساءً',
    description: 'مكتب بريد يخدم نجع رشوان، مثبت كنقطة مستقلة على خرائط Google ومتقاطع مع أدلة البريد العامة بالرقم البريدي 82783.',
    rating: 3.2,
    reviewCount: 5,
    ratingSource: 'google',
    source: 'google_maps',
    sourceStatus: 'cross_checked',
    googlePlaceId: 'ChIJ6-rMm1xPTxQRbm8t-vevtWE',
    googleMapsUrl: maps('مكتب بريد نجع رشوان العسيرات', 'ChIJ6-rMm1xPTxQRbm8t-vevtWE'),
    lastUpdatedAt: '2026-09-17',
  },
  {
    id: 'government-مكتب-بريد-اولاد-غازي-اولاد-بهيج',
    slug: 'مكتب-بريد-اولاد-غازي-اولاد-بهيج',
    title: 'مكتب بريد أولاد غازي',
    category: 'government',
    subCategory: 'مكتب بريد',
    location: 'شارع أولاد غازي، أولاد بهيج، مركز العسيرات، محافظة سوهاج',
    village: 'أولاد بهيج',
    locality: 'أولاد غازي',
    hours: 'الأحد إلى الخميس من 8:00 صباحًا إلى 3:00 مساءً',
    description: 'مكتب بريد يخدم أولاد غازي ضمن نطاق أولاد بهيج، مثبت كنقطة مستقلة على خرائط Google ومتقاطع مع أدلة البريد العامة بالرقم البريدي 82696.',
    reviewCount: 0,
    source: 'google_maps',
    sourceStatus: 'cross_checked',
    googlePlaceId: 'ChIJ-YXESvpdTxQRI4lbktUy1EA',
    googleMapsUrl: maps('مكتب بريد أولاد غازي العسيرات', 'ChIJ-YXESvpdTxQRI4lbktUy1EA'),
    lastUpdatedAt: '2026-09-17',
  },
];
