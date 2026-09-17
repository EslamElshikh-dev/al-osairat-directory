import type { DirectoryListing } from '../types';

const maps = (query: string, placeId?: string) => {
  const params = new URLSearchParams({ api: '1', query });
  if (placeId) params.set('query_place_id', placeId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
};

export const awladBahigPostOfficeScan20260917: DirectoryListing[] = [
  {
    id: 'government-مكتب-بريد-اولاد-بهيج',
    slug: 'مكتب-بريد-اولاد-بهيج',
    title: 'مكتب بريد أولاد بهيج',
    category: 'government',
    subCategory: 'مكتب بريد',
    location: 'أولاد بهيج، مركز العسيرات، محافظة سوهاج',
    village: 'أولاد بهيج',
    phone: '0934870498',
    hours: 'الأحد إلى الخميس من 8:00 ص إلى 3:00 م',
    description: 'مكتب بريد أولاد بهيج مثبت على خرائط Google ومتقاطع مع أكثر من دليل بريدي حديث يذكر العنوان والرمز 82742 ورقم الهاتف نفسه.',
    reviewCount: 0,
    source: 'google_maps',
    sourceStatus: 'cross_checked',
    googlePlaceId: 'ChIJsSnpn5NPTxQR_P-n8fUaIGc',
    googleMapsUrl: maps('مكتب بريد أولاد بهيج', 'ChIJsSnpn5NPTxQR_P-n8fUaIGc'),
    lastUpdatedAt: '2026-09-17',
  },
];