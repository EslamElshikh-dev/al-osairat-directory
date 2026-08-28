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
  reviewCount?: number;
  openingHours?: string;
  delivery?: boolean;
  googlePlaceId?: string;
  googleMapsPlusCode?: string;
  dataSource?: 'legacy_directory' | 'google_maps' | 'cross_checked';
  verificationStatus?: 'verified' | 'cross_checked' | 'needs_review';
}

export interface MapResearchCandidate {
  id: string;
  title: string;
  category: DirectoryListing['category'];
  categoryLabel: string;
  subCategory?: string;
  village: string;
  location: string;
  googleMapsPlusCode?: string;
  googlePlaceId?: string;
  reasonForReview: string;
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
    dataSource: 'legacy_directory',
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
    dataSource: 'legacy_directory',
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
    dataSource: 'legacy_directory',
  },
  {
    id: 'shop-gazirat-1',
    title: 'سوبر ماركت الحاج علي فراج',
    category: 'shops',
    categoryLabel: 'محلات وتجارة',
    subCategory: 'سوبر ماركت',
    location: 'جزيرة أولاد حمزة — موضع خرائط Google: 9RVR+3G2؛ وبحسب البيانات المحلية بجوار مسجد آل الفراغلة',
    village: 'جزيرة أولاد حمزة',
    phone: '01147557796',
    googleMapsPlusCode: '9RVR+3G2',
    dataSource: 'cross_checked',
    verificationStatus: 'cross_checked',
  },
  {
    id: 'shop-gazirat-2',
    title: 'سوبر ماركت الشمندي',
    category: 'shops',
    categoryLabel: 'محلات وتجارة',
    subCategory: 'سوبر ماركت',
    location: 'جزيرة أولاد حمزة، مركز العسيرات، سوهاج',
    village: 'جزيرة أولاد حمزة',
    phone: '01111005223',
    openingHours: 'مفتوح 24 ساعة في أغلب أيام الأسبوع؛ الجمعة 7:00 ص – 12:00 م وفق بيانات خرائط Google المفهرسة',
    dataSource: 'google_maps',
    verificationStatus: 'cross_checked',
  },
  {
    id: 'shop-gazirat-3',
    title: 'سوبر ماركت أبناء الشيخ',
    category: 'shops',
    categoryLabel: 'محلات وتجارة',
    subCategory: 'سوبر ماركت',
    location: 'جزيرة أولاد حمزة، مركز العسيرات، سوهاج',
    village: 'جزيرة أولاد حمزة',
    openingHours: '24 ساعة وفق بيانات خرائط Google المفهرسة',
    delivery: true,
    dataSource: 'google_maps',
    verificationStatus: 'cross_checked',
  },
  {
    id: 'shop-gazirat-4',
    title: 'عمك عمر',
    category: 'shops',
    categoryLabel: 'محلات وتجارة',
    subCategory: 'قطع غيار سيارات',
    location: 'جزيرة أولاد حمزة، مركز العسيرات، سوهاج — 9VJ3+G5F',
    village: 'جزيرة أولاد حمزة',
    googlePlaceId: 'ChIJq80WH_tPTxQRwnALUiqSws8',
    googleMapsPlusCode: '9VJ3+G5F',
    reviewCount: 0,
    dataSource: 'google_maps',
    verificationStatus: 'verified',
  },
];

// نتائج ظهرت في نطاق جزيرة أولاد حمزة على خرائط/فهارس Google،
// لكن لا توجد بعد بيانات كافية لنشرها كقوائم مؤكدة داخل الدليل.
export const mapResearchCandidates: MapResearchCandidate[] = [
  {
    id: 'candidate-gazirat-1',
    title: 'سوبر ماركت أبناء حسن سعادة',
    category: 'shops',
    categoryLabel: 'محلات وتجارة',
    subCategory: 'سوبر ماركت',
    village: 'جزيرة أولاد حمزة',
    location: 'جزيرة أولاد حمزة — 9RRV+88W',
    googleMapsPlusCode: '9RRV+88W',
    reasonForReview: 'ظهر ضمن الأنشطة القريبة المفهرسة لخرائط Google، لكن لم تتوفر بيانات اتصال أو ملف مكان مباشر كافٍ للتحقق الكامل.',
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
