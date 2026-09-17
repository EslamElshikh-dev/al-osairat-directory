import type { DirectoryListing } from '../types';

const maps = (query: string, placeId?: string) => {
  const params = new URLSearchParams({ api: '1', query });
  if (placeId) params.set('query_place_id', placeId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
};

export const awladAliCenterServicesScan20260917: DirectoryListing[] = [
  {
    id: 'education-معهد-بنين-اولاد-علي-الازهري',
    slug: 'معهد-بنين-اولاد-علي-الازهري',
    title: 'معهد بنين أولاد علي الأزهري',
    category: 'education',
    subCategory: 'معهد أزهري بنين',
    location: 'أولاد علي، أولاد حمزة، مركز العسيرات، محافظة سوهاج',
    village: 'أولاد حمزة',
    locality: 'أولاد علي',
    description: 'معهد أزهري للبنين في أولاد علي. تؤكد متابعة منطقة سوهاج الأزهرية في يونيو 2026 وجود لجنة بنين أولاد علي ضمن لجان الثانوية الأزهرية بمركز العسيرات، كما تتطابق أولاد علي جغرافيًا مع نطاق قرية أولاد حمزة.',
    reviewCount: 0,
    source: 'user_collected',
    sourceStatus: 'cross_checked',
    lastUpdatedAt: '2026-09-17',
  },
  {
    id: 'education-معهد-فتيات-اولاد-علي-الازهري',
    slug: 'معهد-فتيات-اولاد-علي-الازهري',
    title: 'معهد فتيات أولاد علي الأزهري',
    category: 'education',
    subCategory: 'معهد أزهري فتيات',
    location: 'أولاد علي، أولاد حمزة، مركز العسيرات، محافظة سوهاج',
    village: 'أولاد حمزة',
    locality: 'أولاد علي',
    description: 'معهد أزهري للفتيات في أولاد علي. ظهر ضمن لجان امتحانات العسيرات التي تابعتها منطقة سوهاج الأزهرية في يونيو 2026، كما ظهر اسم المعهد في نتائج أنشطة واتحادات الطالبات الأزهرية خلال 2024 و2025.',
    reviewCount: 0,
    source: 'user_collected',
    sourceStatus: 'cross_checked',
    lastUpdatedAt: '2026-09-17',
  },
  {
    id: 'government-الوحدة-المحلية-لمركز-ومدينة-العسيرات',
    slug: 'الوحدة-المحلية-لمركز-ومدينة-العسيرات',
    title: 'الوحدة المحلية لمركز ومدينة العسيرات',
    category: 'government',
    subCategory: 'وحدة محلية / مجلس مدينة',
    location: '9RXC+74M، أولاد حمزة، مركز العسيرات، محافظة سوهاج',
    village: 'أولاد حمزة',
    description: 'المقر الإداري للوحدة المحلية لمركز ومدينة العسيرات. تتطابق بيانات أدلة الأعمال العامة مع نقطة خرائط Google المسجلة باسم مجلس مدينة العسيرات في أولاد حمزة.',
    rating: 5,
    reviewCount: 3,
    ratingSource: 'google',
    source: 'google_maps',
    sourceStatus: 'cross_checked',
    googlePlaceId: 'ChIJm70QWAVPTxQR4FNVKqDu800',
    googleMapsPlusCode: '9RXC+74M',
    googleMapsUrl: maps('الوحدة المحلية لمركز ومدينة العسيرات', 'ChIJm70QWAVPTxQR4FNVKqDu800'),
    lastUpdatedAt: '2026-09-17',
  },
];
