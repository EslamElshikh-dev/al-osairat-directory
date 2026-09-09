import type { DirectoryCategory, DirectoryListing } from './types';

export type DirectoryImage = {
  src: string;
  alt: string;
  position?: string;
};

const directoryImages: Record<DirectoryCategory, DirectoryImage> = {
  doctors: { src: '/images/directory/category-doctors.webp', alt: 'عيادة وخدمات طبية في بيئة محلية مصرية' },
  pharmacies: { src: '/images/directory/category-doctors.webp', alt: 'خدمات صحية وصيدلية في بيئة محلية مصرية' },
  shops: { src: '/images/directory/category-shops.webp', alt: 'محل بقالة وتجهيزات تجارية في قرية مصرية' },
  education: { src: '/images/directory/category-education.webp', alt: 'فصل دراسي وخدمات تعليمية في صعيد مصر' },
  crafts: { src: '/images/directory/category-crafts.webp', alt: 'ورشة حرفية مجهزة بالأدوات والخامات' },
  restaurants: { src: '/images/directory/category-restaurants.webp', alt: 'مخبوزات وطعام مصري محلي' },
  lawyers: { src: '/images/directory/category-lawyers.webp', alt: 'مكتب محاماة وخدمات قانونية' },
  clerics: { src: '/images/directory/category-clerics.webp', alt: 'كتب دينية ومصحف في ساحة مسجد' },
  government: { src: '/images/directory/category-government.webp', alt: 'مكتب خدمات حكومية ومحلية في مصر' },
  community: { src: '/images/directory/blog-families.webp', alt: 'ديوان عائلي في قرية من قرى صعيد مصر' },
  worship: { src: '/images/directory/category-worship.webp', alt: 'مسجد وكنيسة وديوان في قرية من قرى صعيد مصر' },
  transport: { src: '/images/directory/category-transport.webp', alt: 'محطة قطار ووسائل مواصلات محلية في صعيد مصر' },
  emergency: { src: '/images/directory/category-emergency.webp', alt: 'سيارة إسعاف ونقطة طبية للطوارئ' },
};

export function imageForCategory(category: DirectoryCategory): DirectoryImage {
  return directoryImages[category];
}

export function imageForListing(listing: Pick<DirectoryListing, 'category' | 'title' | 'subCategory'>): DirectoryImage {
  const image = imageForCategory(listing.category);
  return { ...image, alt: `صورة تعبيرية عن ${listing.subCategory || image.alt} - ${listing.title}` };
}
