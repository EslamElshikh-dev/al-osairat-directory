import type { DirectoryListing } from '../types';
import { awladAliCenterServicesScan20260917 } from './awlad-ali-center-services-scan-2026-09-17';

const maps = (query: string, placeId?: string) => {
  const params = new URLSearchParams({ api: '1', query });
  if (placeId) params.set('query_place_id', placeId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
};

const nagAbbasListings: DirectoryListing[] = [
  {
    id: 'education-معهد-بنين-نجع-عباس-الاعدادي-الثانوي',
    slug: 'معهد-بنين-نجع-عباس-الاعدادي-الثانوي',
    title: 'معهد بنين نجع عباس الإعدادي الثانوي',
    category: 'education',
    subCategory: 'معهد أزهري بنين',
    location: 'نجع عباس، مركز العسيرات، محافظة سوهاج',
    village: 'الرشايدة',
    locality: 'نجع عباس',
    description: 'معهد أزهري بنين بنجع عباس؛ ورد بالاسم ضمن معاهد إدارة العسيرات في إعلان رسمي لمنطقة سوهاج الأزهرية، واستمر ظهوره ضمن لجان امتحانات الثانوية الأزهرية التي تفقدتها المنطقة في يونيو 2026.',
    reviewCount: 0,
    source: 'user_collected',
    sourceStatus: 'cross_checked',
    lastUpdatedAt: '2026-09-17',
  },
  {
    id: 'education-معهد-فتيات-نجع-عباس-الاعدادي-الثانوي',
    slug: 'معهد-فتيات-نجع-عباس-الاعدادي-الثانوي',
    title: 'معهد فتيات نجع عباس الإعدادي الثانوي',
    category: 'education',
    subCategory: 'معهد أزهري فتيات',
    location: 'نجع عباس، مركز العسيرات، محافظة سوهاج',
    village: 'الرشايدة',
    locality: 'نجع عباس',
    description: 'معهد أزهري للفتيات بنجع عباس؛ تؤكد مصادر الأزهر وجوده بالاسم ضمن معاهد إدارة العسيرات، كما ورد نجع عباس ضمن لجان الامتحانات التي شملتها متابعة المنطقة الأزهرية في 2026.',
    reviewCount: 0,
    source: 'user_collected',
    sourceStatus: 'cross_checked',
    lastUpdatedAt: '2026-09-17',
  },
  {
    id: 'government-مكتب-بريد-نجع-عباس',
    slug: 'مكتب-بريد-نجع-عباس',
    title: 'مكتب بريد نجع عباس',
    category: 'government',
    subCategory: 'مكتب بريد',
    location: 'نجع عباس، مركز العسيرات، محافظة سوهاج',
    village: 'الرشايدة',
    locality: 'نجع عباس',
    hours: 'الأحد إلى الخميس من 8:00 صباحًا إلى 3:00 مساءً بحسب أدلة البريد العامة',
    description: 'مكتب بريد يخدم نجع عباس والمناطق المحيطة، وله نقطة مستقلة على خرائط Google. يظهر المكتب في أدلة البريد بالرقم البريدي 82864.',
    rating: 4.3,
    reviewCount: 4,
    ratingSource: 'google',
    source: 'google_maps',
    sourceStatus: 'cross_checked',
    googlePlaceId: 'ChIJk8nTpgdMTxQRHX0odPHRXlI',
    googleMapsUrl: maps('مكتب بريد نجع عباس العسيرات', 'ChIJk8nTpgdMTxQRHX0odPHRXlI'),
    lastUpdatedAt: '2026-09-17',
  },
  {
    id: 'shops-معرض-مكة-للادوات-المنزلية-نجع-عباس',
    slug: 'معرض-مكة-للادوات-المنزلية-نجع-عباس',
    title: 'معرض مكة للأدوات المنزلية',
    category: 'shops',
    subCategory: 'أدوات منزلية',
    location: '9RF9+JQ4، نجع عباس، مركز العسيرات، محافظة سوهاج',
    village: 'الرشايدة',
    locality: 'نجع عباس',
    hours: 'مفتوح 24 ساعة يوميًا بحسب ملف خرائط Google',
    description: 'معرض أدوات منزلية داخل نجع عباس، مثبت كنقطة نشاط مستقلة على خرائط Google.',
    rating: 5,
    reviewCount: 1,
    ratingSource: 'google',
    source: 'google_maps',
    sourceStatus: 'google_verified',
    googlePlaceId: 'ChIJfQl3EsBPTxQRJevHTHPBH1M',
    googleMapsPlusCode: '9RF9+JQ4',
    googleMapsUrl: maps('معرض مكة للادوات المنزلية نجع عباس', 'ChIJfQl3EsBPTxQRJevHTHPBH1M'),
    lastUpdatedAt: '2026-09-17',
  },
];

export const nagAbbasFollowupScan20260917: DirectoryListing[] = [
  ...nagAbbasListings,
  ...awladAliCenterServicesScan20260917,
];
