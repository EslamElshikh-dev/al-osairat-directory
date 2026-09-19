export type ArticleJourneyLink = {
  afterSectionId: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  label: string;
};

type ArticleJourney = {
  relatedSlugs: string[];
  links: ArticleJourneyLink[];
};

export const articleJourneys: Record<string, ArticleJourney> = {
  'markaz-al-osairat': {
    relatedSlugs: ['origin-name-al-osairat', 'al-osairat-landmarks', 'famous-families-al-osairat'],
    links: [
      {
        afterSectionId: 'villages',
        eyebrow: 'كمّل الصورة',
        title: 'القرى العشر مش مجرد أسماء في قائمة',
        description: 'افتح دليل القرى وشوف كل قرية وتوابعها والخدمات المرتبطة بها.',
        href: '/villages',
        label: 'استكشف قرى العسيرات',
      },
      {
        afterSectionId: 'administrative-history',
        eyebrow: 'ورا الاسم حكاية',
        title: 'طيب اسم «العسيرات» نفسه جه منين؟',
        description: 'راجع الروايات التاريخية عن بني أسرات وعسير وطوخ الجبل من غير ما نحول الاحتمال إلى حقيقة.',
        href: '/blog/origin-name-al-osairat',
        label: 'اقرأ قصة الاسم',
      },
    ],
  },
  'al-osairat-landmarks': {
    relatedSlugs: ['markaz-al-osairat', 'origin-name-al-osairat', 'al-osairat-famous-people'],
    links: [
      {
        afterSectionId: 'railway',
        eyebrow: 'من المعلم للخدمة',
        title: 'محتاج توصل لخدمة فعلية بدل ما تكتفي بالحكاية؟',
        description: 'الدليل يجمع الأنشطة والخدمات والعناوين المتاحة داخل قرى المركز.',
        href: '/directory',
        label: 'افتح دليل الخدمات',
      },
      {
        afterSectionId: 'hospital',
        eyebrow: 'في وقت الحاجة',
        title: 'خدمات الطوارئ والأماكن المهمة في مكان واحد',
        description: 'راجع قسم الطوارئ والخدمات الأساسية قبل ما تبدأ تسأل في كل اتجاه.',
        href: '/emergency',
        label: 'خدمات الطوارئ',
      },
    ],
  },
  'al-osairat-famous-people': {
    relatedSlugs: ['famous-families-al-osairat', 'markaz-al-osairat', 'origin-name-al-osairat'],
    links: [
      {
        afterSectionId: 'aburehab',
        eyebrow: 'الناس والمكان',
        title: 'الأسماء لا تظهر من فراغ… وراءها قرى وعائلات وذاكرة محلية',
        description: 'انتقل إلى الحصر الموسع لعائلات وبيوت العسيرات مع توضيح درجة التوثيق.',
        href: '/blog/famous-families-al-osairat',
        label: 'اقرأ ملف العائلات',
      },
    ],
  },
  'origin-name-al-osairat': {
    relatedSlugs: ['markaz-al-osairat', 'famous-families-al-osairat', 'al-osairat-landmarks'],
    links: [
      {
        afterSectionId: 'tukh',
        eyebrow: 'من الاسم إلى الخريطة',
        title: 'بعد التاريخ… شوف شكل المركز الحالي وقرى اليوم',
        description: 'مقال مركز العسيرات يجمع التكوين الإداري الحديث والقرى والسكان والخدمات.',
        href: '/blog/markaz-al-osairat',
        label: 'شوف العسيرات اليوم',
      },
    ],
  },
  'famous-families-al-osairat': {
    relatedSlugs: ['al-osairat-famous-people', 'markaz-al-osairat', 'origin-name-al-osairat'],
    links: [
      {
        afterSectionId: 'methodology',
        eyebrow: 'قاعدة مهمة',
        title: 'عايز تعرف القرية نفسها قبل أسماء البيوت؟',
        description: 'دليل القرى يثبت الحدود والتوابع أولًا، وده يقلل خلط الأسماء بين قرية وأخرى.',
        href: '/villages',
        label: 'افتح دليل القرى',
      },
      {
        afterSectionId: 'verification-and-updates',
        eyebrow: 'عندك تصحيح؟',
        title: 'المعلومة الأقوى هي اللي نقدر نراجعها',
        description: 'لو عندك نشاط أو مكان أو مرجع عام واضح، تقدر تبدأ من الدليل وتساعد في تحسين البيانات المنشورة.',
        href: '/directory',
        label: 'انتقل إلى الدليل',
      },
    ],
  },
};

export function getArticleJourney(slug: string) {
  return articleJourneys[slug] ?? { relatedSlugs: [], links: [] };
}
