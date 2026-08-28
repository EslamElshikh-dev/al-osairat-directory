export interface DirectoryListing {
  id: string;
  title: string;
  category: 'doctors' | 'hospitals' | 'pharmacies' | 'gov' | 'crafts' | 'shops' | 'drivers' | 'restaurants' | 'lawyers' | 'clerics';
  categoryLabel: string;
  subCategory?: string;
  location: string;
  village: string;
  phone?: string;
  emergency?: boolean;
  coordinates?: { lat: number; lng: number };
  rating?: number;
}

export interface HeritageArticle {
  id: string;
  title: string;
  type: 'celebrity' | 'village_history' | 'family';
  summary: string;
  fullContent: string;
  wikidataId?: string;
}

export const initialListings: DirectoryListing[] = [
  {
    id: 'doc-1',
    title: 'عيادة العسيرات (طوارئ)',
    category: 'hospitals',
    categoryLabel: 'مستشفيات وطوارئ',
    location: 'العسيرات',
    village: 'العسيرات المركز',
    phone: '01126871051',
    emergency: true,
    rating: 4.8,
  },
  {
    id: 'doc-2',
    title: 'مستشفى العسيرات المركزي',
    category: 'hospitals',
    categoryLabel: 'مستشفيات وطوارئ',
    location: 'قرية أولاد حمزة بجوار صيدلية علاء الدين',
    village: 'أولاد حمزة',
    emergency: true,
    rating: 4.6,
  },
  {
    id: 'doc-3',
    title: 'د. عمر فتحي (نساء وتوليد)',
    category: 'doctors',
    categoryLabel: 'أطباء وعيادات',
    subCategory: 'نساء وتوليد',
    location: 'أولاد علي بجوار الشهر العقاري',
    village: 'أولاد علي',
    rating: 4.9,
  },
  {
    id: 'doc-4',
    title: 'د. أحمد حارس السيد (نساء وتوليد)',
    category: 'doctors',
    categoryLabel: 'أطباء وعيادات',
    subCategory: 'نساء وتوليد',
    location: 'ساقلتة',
    village: 'ساقلتة',
    phone: '01201095148',
    rating: 4.9,
  },
];

export const villagesData = [
  'أولاد حمزة', 'أولاد جبارة', 'جزيرة أولاد حمزة', 'أولاد علي', 'النويرات', 'الرشايدة', 'أولاد بهيج'
];

export const heritageCelebrities: HeritageArticle[] = [
  {
    id: 'cel-4',
    title: 'المهندس إسلام الشيخ',
    type: 'celebrity',
    summary: 'مهندس أمن سيبراني ومطور برمجيات، خبير منتجات جوجل معتمد.',
    fullContent: 'يعمل من الرياض بالسعودية، أشرف على إدارة 1411 ملف تجاري بجوجل و154 مشروع سحابي.',
    wikidataId: 'Q138800449',
  }
];

export const developerProfile = {
  name: 'المهندس إسلام الشيخ',
  role: 'مهندس أمن سيبراني | مطور برمجيات | خبير منتجات Google',
  location: 'الرياض، المملكة العربية السعودية',
  achievements: [
    'إدارة وتوثيق أكثر من 1411 ملفاً تجارياً على خرائط Google',
    'تطوير وتصميم أكثر من 30 موقعاً وتطبيقاً رقمياً متكاملاً',
  ],
  vision: 'تقديم حلول رقمية مجتمعية تجمع بين الحماية والأمن السيبراني والظهور المحلي (Local SEO).',
  website: 'https://eslam-elshikh.com',
};
