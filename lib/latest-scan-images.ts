import type { DirectoryListing } from './types';

const latestScanImages: Record<string, string> = {
  'education-مدرسة-الشيخ-يوسف-الاعدادية-للتعليم-الاساس': '/images/activities/sheikh-yusuf-preparatory-school.svg',
  'worship-مقام-الشيخ-يوسف-اولاد-بهيج': '/images/activities/sheikh-yusuf-shrine.svg',
  'community-دوار-ال-قاقا-الشيخ-يوسف': '/images/activities/sheikh-yusuf-al-qaqa-diwan.svg',
  'government-مكتب-بريد-اولاد-بهيج': '/images/activities/awlad-bahig-post-office.svg',
  'pharmacies-صيدلية-دكتور-احمد-السيد-اولاد-بهيج': '/images/activities/awlad-bahig-ahmed-pharmacy.svg',
  'worship-مسجد-ال-حمد-اولاد-بهيج': '/images/activities/awlad-bahig-al-hamad-mosque.svg',
  'worship-مسجد-عمر-بن-الخطاب-الشيخ-يوسف-اولاد-بهيج': '/images/activities/sheikh-yusuf-omar-mosque.svg',
  'worship-مسجد-ال-رشوان-الشيخ-يوسف-اولاد-بهيج': '/images/activities/sheikh-yusuf-al-rashwan-mosque.svg',
  'worship-مسجد-ال-حسان-اولاد-بهيج': '/images/activities/awlad-bahig-al-hassan-mosque.svg',
  'worship-مسجد-النور-ال-عمران-اولاد-بهيج': '/images/activities/awlad-bahig-al-imran-noor-mosque.svg',
  'worship-مسجد-الرحمن-الرحيم-اولاد-بهيج': '/images/activities/awlad-bahig-rahman-raheem-mosque.svg',
};

export function latestScanImageForListing(
  listing: Pick<DirectoryListing, 'id' | 'title' | 'subCategory'>,
) {
  const src = latestScanImages[listing.id];
  if (!src) return null;
  return {
    src,
    alt: `صورة تعبيرية مخصصة عن ${listing.subCategory || 'النشاط'} - ${listing.title}`,
    kind: 'illustrative' as const,
    label: 'صورة تعبيرية مخصصة',
  };
}
