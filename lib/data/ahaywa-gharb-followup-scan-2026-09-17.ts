import type { DirectoryListing } from '../types';

const maps = (query: string, placeId?: string) => {
  const params = new URLSearchParams({ api: '1', query });
  if (placeId) params.set('query_place_id', placeId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
};

export const ahaywaGharbFollowupScan20260917: DirectoryListing[] = [
  {
    id: 'community-مركز-شباب-الاحايوة-غرب',
    slug: 'مركز-شباب-الاحايوة-غرب',
    title: 'مركز شباب الأحايوة غرب',
    category: 'community',
    subCategory: 'مركز شباب',
    location: 'الدويرات - الأحايوة غرب، مركز العسيرات، محافظة سوهاج',
    village: 'الأحايوة غرب',
    description: 'مركز شباب نشط بالأحايوة غرب؛ ظهر في تفتيش مالي وإداري لوزارة الشباب والرياضة، وسبق توثيق أعمال تطويره ضمن مشروعات حياة كريمة، كما له نقطة مستقلة على خرائط Google.',
    rating: 4.2,
    reviewCount: 5,
    ratingSource: 'google',
    source: 'google_maps',
    sourceStatus: 'cross_checked',
    googlePlaceId: 'ChIJO40Sav1RTxQRowe9s28KI18',
    googleMapsUrl: maps('مركز شباب الاحايوة غرب', 'ChIJO40Sav1RTxQRowe9s28KI18'),
    lastUpdatedAt: '2026-09-17',
  },
  {
    id: 'pharmacies-صيدلية-الدكتور-السيد-الاحايوة-غرب',
    slug: 'صيدلية-الدكتور-السيد-الاحايوة-غرب',
    title: 'صيدلية الدكتور السيد بالأحايوة غرب',
    category: 'pharmacies',
    subCategory: 'صيدلية',
    location: 'شارع الشروفات، الأحايوة غرب، مركز العسيرات، محافظة سوهاج',
    village: 'الأحايوة غرب',
    phone: '0932441484',
    hours: 'يوميًا من 9:00 صباحًا إلى 11:00 مساءً بحسب المصدر',
    description: 'صيدلية محلية بالأحايوة غرب؛ ينشر دليل طبي متخصص عنوانها ورقم الهاتف وساعات العمل وخدمات قياس الضغط والسكر والوزن. لم يظهر تطابق مستقل حديث كافٍ لرفعها إلى cross_checked، لذلك تبقى بحالة مصدر واحد.',
    reviewCount: 0,
    source: 'user_collected',
    sourceStatus: 'source_only',
    lastUpdatedAt: '2026-09-17',
  },
];
