import type { DirectoryCategory, DirectoryListing } from './types';
import activityImageManifest from './data/activity-image-manifest.json';

export type DirectoryImage = {
  src: string;
  alt: string;
  position?: string;
  kind: 'illustrative';
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

const listingImages = activityImageManifest as Record<string, { src: string }>;

export function imageForCategory(category: DirectoryCategory): DirectoryImage {
  return directoryImages[category];
}

export function imageForListing(listing: Pick<DirectoryListing, 'id' | 'category' | 'title' | 'subCategory'>): DirectoryImage {
  const customImage = listingImages[listing.id];
  if (customImage) {
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
