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
    description: 'معهد أزهري للبنين في أولاد علي. أكدت متابعة رسمية لمنطقة سوهاج الأزهرية يوم 28 يونيو 2026 وجود لجنة بنين أولاد علي ضمن لجان امتحانات الثانوية الأزهرية، إلى جانب لجنة فتيات أولاد علي.',
    reviewCount: 0,
    source: 'user_collected',
    sourceStatus: 'cross_checked',
    lastUpdatedAt: '2026-09-18',
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
    description: 'معهد أزهري للفتيات في أولاد علي. تؤكد منطقة سوهاج الأزهرية استمرار نشاط المعهد في العام الدراسي 2025/2026، كما أُعلن في مايو 2026 اعتماد معهد فتيات أولاد علي الإعدادي ضمن معاهد سوهاج الأزهرية الحاصلة على اعتماد الجودة.',
    reviewCount: 0,
    source: 'user_collected',
    sourceStatus: 'cross_checked',
    lastUpdatedAt: '2026-09-18',
  },
  {
    id: 'government-الوحدة-المحلية-لمركز-ومدينة-العسيرات',
    slug: 'الوحدة-المحلية-لمركز-ومدينة-العسيرات',
    title: 'مجلس مدينة العسيرات',
    category: 'government',
    subCategory: 'وحدة محلية / مجلس مدينة',
    location: '9RXC+74M، أولاد حمزة، مركز العسيرات، محافظة سوهاج',
    village: 'أولاد حمزة',
    description: 'مقر مجلس مدينة العسيرات في أولاد حمزة. جرى التحقق من نقطة خرائط Google الحالية بنفس Plus Code ومعرّف المكان، وتدعمها إشارة صحفية إلى مبنى المجلس المحلي في أولاد حمزة.',
    rating: 5,
    reviewCount: 3,
    ratingSource: 'google',
    source: 'google_maps',
    sourceStatus: 'google_verified',
    googlePlaceId: 'ChIJm70QWAVPTxQR4FNVKqDu800',
    googleMapsPlusCode: '9RXC+74M',
    googleMapsUrl: maps('مجلس مدينة العسيرات', 'ChIJm70QWAVPTxQR4FNVKqDu800'),
    lastUpdatedAt: '2026-09-18',
  },
];
