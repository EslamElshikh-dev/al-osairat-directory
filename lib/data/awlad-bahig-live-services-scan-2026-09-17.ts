import type { DirectoryListing } from '../types';

const maps = (query: string, placeId?: string) => {
  const params = new URLSearchParams({ api: '1', query });
  if (placeId) params.set('query_place_id', placeId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
};

export const awladBahigLiveServicesScan20260917: DirectoryListing[] = [
  {
    id: 'government-مكتب-بريد-اولاد-بهيج',
    slug: 'مكتب-بريد-اولاد-بهيج',
    title: 'مكتب بريد أولاد بهيج',
    category: 'government',
    subCategory: 'مكتب بريد',
    location: 'أولاد بهيج، مركز العسيرات، محافظة سوهاج',
    village: 'أولاد بهيج',
    phone: '0934870498',
    hours: 'الأحد إلى الخميس من 8:00 صباحًا إلى 3:00 مساءً',
    description: 'مكتب بريد أولاد بهيج برقم بريدي 82742، متقاطع بين نقطة Maps وأدلة بريد عامة حديثة بنفس الهاتف ومواعيد العمل.',
    reviewCount: 0,
    source: 'google_maps',
    sourceStatus: 'cross_checked',
    googlePlaceId: 'ChIJq6qqqtFaTxQRU31cZptCouM',
    googleMapsUrl: maps('مكتب بريد أولاد بهيج', 'ChIJq6qqqtFaTxQRU31cZptCouM'),
    lastUpdatedAt: '2026-09-17',
  },
  {
    id: 'pharmacies-صيدلية-دكتور-احمد-السيد-اولاد-بهيج',
    slug: 'صيدلية-دكتور-احمد-السيد-اولاد-بهيج',
    title: 'صيدلية د/ أحمد السيد',
    category: 'pharmacies',
    subCategory: 'صيدلية',
    location: '9RCJ+84Q، أولاد بهيج، مركز العسيرات، محافظة سوهاج',
    village: 'أولاد بهيج',
    phone: '01001589684',
    hours: 'يوميًا من 8:00 صباحًا إلى 12:00 منتصف الليل',
    description: 'صيدلية محلية مثبتة كنقطة مستقلة على خرائط Google داخل أولاد بهيج.',
    rating: 4.9,
    reviewCount: 9,
    ratingSource: 'google',
    source: 'google_maps',
    sourceStatus: 'google_verified',
    googlePlaceId: 'ChIJ-_O0XhJOTxQRKZ8bE44wLWw',
    googleMapsPlusCode: '9RCJ+84Q',
    googleMapsUrl: maps('صيدلية د أحمد السيد أولاد بهيج', 'ChIJ-_O0XhJOTxQRKZ8bE44wLWw'),
    lastUpdatedAt: '2026-09-17',
  },
  {
    id: 'worship-مسجد-ال-حمد-اولاد-بهيج',
    slug: 'مسجد-ال-حمد-اولاد-بهيج',
    title: 'مسجد آل حمد',
    category: 'worship',
    subCategory: 'مسجد',
    location: '9R9W+H3R، الشرقية، أولاد بهيج، مركز العسيرات، محافظة سوهاج',
    village: 'أولاد بهيج',
    description: 'مسجد محلي مثبت كنقطة مستقلة على خرائط Google داخل نطاق أولاد بهيج.',
    rating: 4.4,
    reviewCount: 12,
    ratingSource: 'google',
    source: 'google_maps',
    sourceStatus: 'google_verified',
    googlePlaceId: 'ChIJWaXoiGVOTxQRugPTHFT9i98',
    googleMapsPlusCode: '9R9W+H3R',
    googleMapsUrl: maps('مسجد آل حمد أولاد بهيج', 'ChIJWaXoiGVOTxQRugPTHFT9i98'),
    lastUpdatedAt: '2026-09-17',
  },
];
