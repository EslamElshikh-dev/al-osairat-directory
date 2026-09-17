import type { DirectoryListing } from '../types';

const maps = (query: string, placeId?: string) => {
  const params = new URLSearchParams({ api: '1', query });
  if (placeId) params.set('query_place_id', placeId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
};

export const awladBahigSheikhYusufScan20260917: DirectoryListing[] = [
  {
    id: 'education-مدرسة-الشيخ-يوسف-الاعدادية-للتعليم-الاساس',
    slug: 'مدرسة-الشيخ-يوسف-الاعدادية-للتعليم-الاساس',
    title: 'مدرسة الشيخ يوسف الإعدادية للتعليم الأساسي',
    category: 'education',
    subCategory: 'مدرسة إعدادية حكومية',
    location: 'نجع الشيخ يوسف، أولاد بهيج، مركز العسيرات، محافظة سوهاج',
    village: 'أولاد بهيج',
    locality: 'الشيخ يوسف',
    description: 'مدرسة إعدادية تخدم نجع الشيخ يوسف، مؤكدة في نتائج الشهادة الإعدادية بمحافظة سوهاج لعام 2026، مع ظهور مستقل للمدرسة ضمن إدارة جرجا التعليمية.',
    reviewCount: 0,
    source: 'user_collected',
    sourceStatus: 'cross_checked',
    lastUpdatedAt: '2026-09-17',
  },
  {
    id: 'worship-مقام-الشيخ-يوسف-اولاد-بهيج',
    slug: 'مقام-الشيخ-يوسف-اولاد-بهيج',
    title: 'مقام الشيخ يوسف',
    category: 'worship',
    subCategory: 'مقام / معلم ديني',
    location: 'نجع الشيخ يوسف، أولاد بهيج، مركز العسيرات، محافظة سوهاج',
    village: 'أولاد بهيج',
    locality: 'الشيخ يوسف',
    description: 'مقام محلي معروف في نجع الشيخ يوسف. أفادت هيئة الأوقاف المصرية في 2023 بأن المقام يتبع المجلس الأعلى للطرق الصوفية، مع تأكيد موقعه داخل نجع الشيخ يوسف التابع لأولاد بهيج.',
    reviewCount: 0,
    source: 'user_collected',
    sourceStatus: 'cross_checked',
    lastUpdatedAt: '2026-09-17',
  },
  {
    id: 'worship-مسجد-ال-عيسى-اولاد-بهيج',
    slug: 'مسجد-ال-عيسى-اولاد-بهيج',
    title: 'مسجد آل عيسى',
    category: 'worship',
    subCategory: 'مسجد',
    location: 'أولاد بهيج، مركز العسيرات، محافظة سوهاج',
    village: 'أولاد بهيج',
    description: 'مسجد عائلي ومحلي في أولاد بهيج، ورد ضمن افتتاحات مساجد محافظة سوهاج، كما ظهر في تغطية محلية حديثة عام 2025 باعتباره مسجد العائلة المستخدم في المناسبات العامة.',
    reviewCount: 0,
    source: 'user_collected',
    sourceStatus: 'cross_checked',
    lastUpdatedAt: '2026-09-17',
  },
  {
    id: 'community-دوار-ال-قاقا-الشيخ-يوسف',
    slug: 'دوار-ال-قاقا-الشيخ-يوسف',
    title: 'دوار عائلة آل قاقا',
    category: 'community',
    subCategory: 'دوار / مكان اجتماعي',
    location: 'الشيخ يوسف، أولاد بهيج، مركز العسيرات، محافظة سوهاج',
    village: 'أولاد بهيج',
    locality: 'الشيخ يوسف',
    description: 'دوار عائلي ومكان اجتماعي ظاهر كنقطة مستقلة على خرائط Google داخل نجع الشيخ يوسف.',
    rating: 5,
    reviewCount: 3,
    ratingSource: 'google',
    source: 'google_maps',
    sourceStatus: 'google_verified',
    googlePlaceId: 'ChIJeZ3KnTVPTxQRGQPW0cd9oCU',
    googleMapsUrl: maps('دوار عائلة آل قاقا الشيخ يوسف أولاد بهيج', 'ChIJeZ3KnTVPTxQRGQPW0cd9oCU'),
    lastUpdatedAt: '2026-09-17',
  },
];
