import type { DirectoryListing } from '../types';

// Village-by-village scan for high-demand services identified from zero-result
// searches. Only records with an exact in-scope Google Maps address/category
// are promoted into the public catalog. Ambiguous, stale, closed or out-of-area
// candidates remain unpublished until a stronger source is available.
export const serviceScan20260904: DirectoryListing[] = [
  {
    id: 'doctors-عيادة-الدكتور-خالد-اسنان-اولاد-حمزة',
    slug: 'عيادة-الدكتور-خالد-اسنان-اولاد-حمزة',
    title: 'عيادة الدكتور خالد',
    category: 'doctors',
    subCategory: 'أسنان',
    location: '9RQF+9JJ، مسجد آل عارف، أولاد حمزة، مركز العسيرات، محافظة سوهاج',
    village: 'أولاد حمزة',
    description: 'عيادة أسنان مدرجة على خرائط Google داخل أولاد حمزة بالقرب من مسجد آل عارف.',
    reviewCount: 0,
    source: 'google_maps',
    sourceStatus: 'google_verified',
    googlePlaceId: 'ChIJdfxCFABPTxQR0BJPAwJj5uI',
    googleMapsPlusCode: '9RQF+9JJ',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=عيادة+الدكتور+خالد&query_place_id=ChIJdfxCFABPTxQR0BJPAwJj5uI',
    lastUpdatedAt: '2026-09-04',
  },
  {
    id: 'doctors-معمل-الشفا-للتحاليل-الطبية-اولاد-حمزة',
    slug: 'معمل-الشفا-للتحاليل-الطبية-اولاد-حمزة',
    title: 'معمل الشفا للتحاليل الطبية',
    category: 'doctors',
    subCategory: 'معمل تحاليل طبية',
    location: '9RR9+FPQ، أولاد حمزة، مركز العسيرات، محافظة سوهاج',
    village: 'أولاد حمزة',
    description: 'معمل تحاليل طبية مدرج على خرائط Google داخل أولاد حمزة بمركز العسيرات.',
    reviewCount: 0,
    source: 'google_maps',
    sourceStatus: 'google_verified',
    googlePlaceId: 'ChIJS3-OK6xPTxQRbE7sjAY9_a8',
    googleMapsPlusCode: '9RR9+FPQ',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=معمل+الشفا+للتحاليل+الطبية&query_place_id=ChIJS3-OK6xPTxQRbE7sjAY9_a8',
    lastUpdatedAt: '2026-09-04',
  },
  {
    id: 'education-حضانة-الجزيره-جزيرة-اولاد-حمزة',
    slug: 'حضانة-الجزيره-جزيرة-اولاد-حمزة',
    title: 'حضانة الجزيره',
    category: 'education',
    subCategory: 'حضانة ورياض أطفال',
    location: '9RMX+FV8، جزيرة أولاد حمزة، مركز العسيرات، محافظة سوهاج',
    village: 'جزيرة أولاد حمزة',
    description: 'حضانة ورياض أطفال مدرجة على خرائط Google داخل قرية جزيرة أولاد حمزة بمركز العسيرات.',
    reviewCount: 0,
    source: 'google_maps',
    sourceStatus: 'google_verified',
    googleMapsPlusCode: '9RMX+FV8',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=حضانة+الجزيره+جزيرة+أولاد+حمزة+العسيرات+سوهاج',
    lastUpdatedAt: '2026-09-04',
  },
];
