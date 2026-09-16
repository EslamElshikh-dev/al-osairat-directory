import type { DirectoryCategory, DirectoryListing } from './types';
import activityImageManifest from './data/activity-image-manifest.json';

export type DirectoryImage = {
  src: string;
  alt: string;
  position?: string;
  kind: 'illustrative' | 'sourced';
  label: string;
};

const directoryImages: Record<DirectoryCategory, DirectoryImage> = {
  doctors: { src: '/images/directory/category-doctors.webp', alt: 'عيادة وخدمات طبية في بيئة محلية مصرية', kind: 'illustrative', label: 'صورة تعبيرية للفئة' },
  pharmacies: { src: '/images/directory/category-doctors.webp', alt: 'خدمات صحية وصيدلية في بيئة محلية مصرية', kind: 'illustrative', label: 'صورة تعبيرية للفئة' },
  shops: { src: '/images/directory/category-shops.webp', alt: 'محل بقالة وتجهيزات تجارية في قرية مصرية', kind: 'illustrative', label: 'صورة تعبيرية للفئة' },
  education: { src: '/images/directory/category-education.webp', alt: 'فصل دراسي وخدمات تعليمية في صعيد مصر', kind: 'illustrative', label: 'صورة تعبيرية للفئة' },
  crafts: { src: '/images/directory/category-crafts.webp', alt: 'ورشة حرفية مجهزة بالأدوات والخامات', kind: 'illustrative', label: 'صورة تعبيرية للفئة' },
  restaurants: { src: '/images/directory/category-restaurants.webp', alt: 'مخبوزات وطعام مصري محلي', kind: 'illustrative', label: 'صورة تعبيرية للفئة' },
  lawyers: { src: '/images/directory/category-lawyers.webp', alt: 'مكتب محاماة وخدمات قانونية', kind: 'illustrative', label: 'صورة تعبيرية للفئة' },
  clerics: { src: '/images/directory/category-clerics.webp', alt: 'كتب دينية ومصحف في ساحة مسجد', kind: 'illustrative', label: 'صورة تعبيرية للفئة' },
  government: { src: '/images/directory/category-government.webp', alt: 'مكتب خدمات حكومية ومحلية في مصر', kind: 'illustrative', label: 'صورة تعبيرية للفئة' },
  community: { src: '/images/directory/blog-families.webp', alt: 'ديوان عائلي في قرية من قرى صعيد مصر', kind: 'illustrative', label: 'صورة تعبيرية للفئة' },
  worship: { src: '/images/directory/category-worship.webp', alt: 'مسجد وكنيسة وديوان في قرية من قرى صعيد مصر', kind: 'illustrative', label: 'صورة تعبيرية للفئة' },
  transport: { src: '/images/directory/category-transport.webp', alt: 'محطة قطار ووسائل مواصلات محلية في صعيد مصر', kind: 'illustrative', label: 'صورة تعبيرية للفئة' },
  emergency: { src: '/images/directory/category-emergency.webp', alt: 'سيارة إسعاف ونقطة طبية للطوارئ', kind: 'illustrative', label: 'صورة تعبيرية للفئة' },
};

type ListingImage = {
  src: string;
  sourceKind?: 'owner_photo';
};

const listingImages = activityImageManifest as Record<string, ListingImage>;

const curatedListingImages: Record<string, ListingImage> = {
  'education-مدرسة-عوامر-العسيرات-الاعدادية': { src: '/images/activities/awamer-preparatory-school.svg' },
  'education-معهد-عوامر-العسيرات': { src: '/images/activities/awamer-azhar-institute.svg' },
  'worship-مسجد-ال-النميسي-عوامر-العسيرات': { src: '/images/activities/awamer-al-nemaisi-mosque.svg' },
  'government-الوحدة-الصحية-بعوامر-العسيرات': { src: '/images/activities/awamer-health-unit.svg' },
  'shops-معرض-النور-للادوات-الصحية-عوامر-العسيرات': { src: '/images/activities/awamer-sanitary-store.svg' },
  'pharmacies-صيدلية-الدكتورة-ولاء-اولاد-جبارة': { src: '/images/activities/olad-gabara-walaa-pharmacy.svg' },
  'government-مستشفى-العسيرات-العام': { src: '/images/activities/osairat-general-hospital.svg' },
  'government-قسم-شرطة-العسيرات': { src: '/images/activities/osairat-police-station.svg' },
  'doctors-معامل-الوسيط-للتحاليل-الطبية': { src: '/images/activities/al-waseet-lab.svg' },
  'shops-الراعي-للتجارة-النويرات': { src: '/images/activities/al-raei-nuwairat-market.svg' },
  'education-مدرسة-ثورة-25-يناير-اولاد-جبارة': { src: '/images/activities/awlad-gabara-25-jan-school.svg' },
  'education-مدرسة-اولاد-جبارة-الابتدائية-القديمة': { src: '/images/activities/awlad-gabara-old-primary-school.svg' },
  'education-مدرسة-النويرات-الاعدادية': { src: '/images/activities/nuwairat-preparatory-school.svg' },
  'community-مركز-شباب-النويرات': { src: '/images/activities/nuwairat-youth-center.svg' },
  'worship-مسجد-ابو-بكر-الصديق-النويرات': { src: '/images/activities/nuwairat-abu-bakr-mosque.svg' },
  'restaurants-مقهى-النويرات': { src: '/images/activities/nuwairat-cafe.svg' },
  'government-مكتب-صابر-حسين-البتيتي-النويرات': { src: '/images/activities/nuwairat-saber-office.svg' },
  'education-مدرسة-اولاد-حمزة-الثانوية-المشتركة': { src: '/images/activities/awlad-hamza-secondary-school.svg' },
  'education-مدرسة-اولاد-حمزة-للتعليم-الاساسي': { src: '/images/activities/awlad-hamza-basic-school.svg' },
  'government-البنك-الزراعي-المصري-اولاد-حمزة': { src: '/images/activities/awlad-hamza-agricultural-bank.svg' },
  'government-بنك-مصر-atm-العسيرات': { src: '/images/activities/awlad-hamza-bank-misr-atm.svg' },
  'worship-مسجد-اولاد-حمزة': { src: '/images/activities/awlad-hamza-mosque.svg' },
  'restaurants-الف-هنا-اولاد-حمزة': { src: '/images/activities/awlad-hamza-alf-hana.svg' },
  'shops-جلاكسي-اولاد-حمزة': { src: '/images/activities/awlad-hamza-galaxy-mobile.svg' },
  'restaurants-مخبز-وحلواني-احباب-الرسول-اولاد-حمزة': { src: '/images/activities/awlad-hamza-ahbab-bakery.svg' },
  'shops-الحاج-عبدالناصر-محمد-جزيرة-اولاد-حمزة': { src: '/images/activities/gazirat-awlad-hamza-nursery.svg' },
  'education-مدرسة-العجوبية-الاعدادية-المشتركة': { src: '/images/activities/rashaida-ajoubia-preparatory.svg' },
  'education-مدرسة-نجع-جبرة-الاعدادية-المشتركة': { src: '/images/activities/rashaida-nag-jabra-preparatory.svg' },
  'education-معهد-الرشايدة-غرب-الابتدائي': { src: '/images/activities/rashaida-west-azhar-institute.svg' },
  'education-مدرسة-الشهداء-الابتدائية': { src: '/images/activities/shuhada-primary-school.svg' },
  'education-مدرسة-الشهداء-الاعدادية': { src: '/images/activities/shuhada-preparatory-school.svg' },
  'government-الوحدة-الصحية-بقرية-الشهداء': { src: '/images/activities/shuhada-health-unit.svg' },
  'education-مدرسة-المساعيد-الاعدادية-الثانوية': { src: '/images/activities/masaeed-secondary-school.svg' },
  'government-الوحدة-الصحية-بالمساعيد': { src: '/images/activities/masaeed-health-unit.svg' },
  'community-نادي-الشباب-والرياضة-بالمساعيد': { src: '/images/activities/masaeed-youth-club.svg' },
  'worship-مسجد-الانوار-المحمدية-ابوزقالي-المساعيد': { src: '/images/activities/masaeed-anwar-mohammedia-mosque.svg' },
  'worship-مسجد-الهادي-ابوزقالي-المساعيد': { src: '/images/activities/masaeed-al-hadi-mosque.svg' },
};

export function imageForCategory(category: DirectoryCategory): DirectoryImage {
  return directoryImages[category];
}

export function imageForListing(listing: Pick<DirectoryListing, 'id' | 'category' | 'title' | 'subCategory'>): DirectoryImage {
  const customImage = curatedListingImages[listing.id] || listingImages[listing.id];
  if (customImage) {
    if (customImage.sourceKind === 'owner_photo') {
      return {
        src: customImage.src,
        alt: `صورة منشورة من ملف النشاط على خرائط Google - ${listing.title}`,
        kind: 'sourced',
        label: 'صورة منشورة من ملف النشاط',
      };
    }

    return {
      src: customImage.src,
      alt: `صورة تعبيرية مخصصة عن ${listing.subCategory || 'النشاط'} - ${listing.title}`,
      kind: 'illustrative',
      label: 'صورة تعبيرية مخصصة',
    };
  }

  const image = imageForCategory(listing.category);
  return { ...image, alt: `صورة تعبيرية عن ${listing.subCategory || image.alt} - ${listing.title}` };
}