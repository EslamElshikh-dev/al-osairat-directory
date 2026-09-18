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
  'worship-مسجد-عباد-الرحمن-نجع-عبدالباري-اولاد-بهيج': '/images/activities/abdulbari-ebad-alrahman-mosque.svg',
  'worship-مسجد-الايمان-اولاد-بهيج': '/images/activities/awlad-bahig-al-iman-mosque.svg',
  'worship-كنيسة-السيدة-العذراء-مريم-والشهيد-ابانوب-الشهداء': '/images/activities/shuhada-virgin-mary-abanob-church.svg',
  'worship-مسجد-ال-البايت-الشهداء': '/images/activities/shuhada-al-bait-mosque.svg',
  'worship-مسجد-الرحمن-الشهداء': '/images/activities/shuhada-al-rahman-mosque.svg',
  'transport-خط-المنشاة-نجع-البايت': '/images/activities/shuhada-al-bait-transport.svg',
  'worship-مسجد-الحفايضة-عوامر-العسيرات': '/images/activities/awamer-hafayda-mosque.svg',
  'education-مدرسة-الشهيد-محمد-عبدالحميد-الابتدائية-نجع-اسخات': '/images/activities/masaeed-shaheed-abdelhamid-school.svg',
  'education-مدرسة-نجع-السوالم-الاعدادية-المشتركة': '/images/activities/masaeed-nag-sawalem-school.svg',
  'education-معهد-اولاد-جبارة-الابتدائي': '/images/activities/awlad-gabara-azhar-institute.svg',
  'worship-مسجد-التوحيد-نجع-ابو-رجل': '/images/activities/awlad-gabara-tawhid-mosque.svg',
  'education-معهد-بنين-المساعيد-الاعدادي-الثانوي': '/images/activities/masaeed-azhar-institute.svg',
  'worship-مسجد-ال-غريب-نجع-ابو-زغيلة': '/images/activities/awlad-gabara-al-ghareeb-mosque.svg',
  'worship-مسجد-مصعب-بن-عمير-نجع-عباس': '/images/activities/awlad-gabara-musab-mosque.svg',
  'worship-مسجد-ال-بكري-نجع-عباس': '/images/activities/awlad-gabara-al-bakri-mosque.svg',
  'worship-مسجد-خاتم-المرسلين-نجع-ابوزقالي': '/images/activities/masaeed-khatam-mosque.svg',
  'worship-مسجد-التوفيق-نجع-ابوزقالي': '/images/activities/masaeed-tawfiq-mosque.svg',
  'worship-مسجد-الانصار-المساعيد': '/images/activities/masaeed-ansar-mosque.svg',
  'worship-مسجد-نجع-العبيط-المساعيد': '/images/activities/masaeed-nag-al-abit-mosque.svg',
  'worship-كنيسة-الشهيد-العظيم-مارجرجس-النويرات': '/images/activities/nuwairat-st-george-church.svg',
  'education-مدرسة-اولاد-غازي-التجريبية-للغات': '/images/activities/awlad-ghazi-language-school.svg',
  'education-مدرسة-اولاد-غازي-الاعدادية-المشتركة': '/images/activities/awlad-ghazi-preparatory-school.svg',
  'worship-مسجد-ابو-بكر-الصديق-القصالي-اولاد-جبارة': '/images/activities/awlad-gabara-al-siddiq-mosque.svg',
  'education-معهد-بنين-اولاد-علي-الازهري': '/images/activities/awlad-ali-boys-azhar-institute.svg',
  'education-معهد-فتيات-اولاد-علي-الازهري': '/images/activities/awlad-ali-girls-azhar-institute.svg',
  'government-الوحدة-المحلية-لمركز-ومدينة-العسيرات': '/images/activities/al-usayrat-city-council.svg',
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
