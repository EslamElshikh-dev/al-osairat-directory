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
  'villages-al-osairat-guide': {
    relatedSlugs: ['markaz-al-osairat', 'transport-al-osairat', 'how-to-use-al-osairat-directory'],
    links: [
      {
        afterSectionId: 'ten-villages',
        eyebrow: 'افتح الخريطة',
        title: 'كل قرية لها صفحة وخدماتها المتاحة',
        description: 'اختار القرية وشوف التوابع والأنشطة بدل ما تبحث باسم المركز كله.',
        href: '/villages',
        label: 'استكشف القرى العشر',
      },
      {
        afterSectionId: 'search-by-need',
        eyebrow: 'محتاج خدمة؟',
        title: 'ابحث بالفئة ثم ضيّق النطاق بالقرية',
        description: 'الأطباء والصيدليات والمحلات والحرفيون والمواصلات في مكان واحد.',
        href: '/directory',
        label: 'افتح دليل الخدمات',
      },
    ],
  },
  'health-services-al-osairat': {
    relatedSlugs: ['al-osairat-landmarks', 'villages-al-osairat-guide', 'how-to-use-al-osairat-directory'],
    links: [
      {
        afterSectionId: 'choose-specialty',
        eyebrow: 'ابدأ البحث',
        title: 'قارن الأطباء والعيادات حسب التخصص والمكان',
        description: 'راجع بيانات الاتصال والعنوان ثم أكد الموعد قبل التحرك.',
        href: '/directory/doctors',
        label: 'دليل الأطباء والعيادات',
      },
      {
        afterSectionId: 'medicine-safety',
        eyebrow: 'صيدلية قريبة',
        title: 'اعثر على الصيدليات المسجلة في قرى العسيرات',
        description: 'ابحث حسب القرية واتصل لتأكيد الدواء وساعات العمل.',
        href: '/directory/pharmacies',
        label: 'دليل الصيدليات',
      },
      {
        afterSectionId: 'hospital-emergency',
        eyebrow: 'وقت الضرورة',
        title: 'الأرقام المهمة لازم تبقى قدامك قبل الأزمة',
        description: 'صفحة مختصرة لأرقام الإسعاف والنجدة والمرافق الأساسية.',
        href: '/emergency',
        label: 'افتح أرقام الطوارئ',
      },
    ],
  },
  'education-al-osairat': {
    relatedSlugs: ['villages-al-osairat-guide', 'how-to-use-al-osairat-directory', 'markaz-al-osairat'],
    links: [
      {
        afterSectionId: 'education-map',
        eyebrow: 'مدرسة أو خدمة تعليمية',
        title: 'ابدأ من قسم التعليم في دليل العسيرات',
        description: 'شوف السجلات المتاحة ثم اتصل بالمؤسسة لتأكيد المرحلة والعنوان.',
        href: '/directory/education',
        label: 'افتح دليل التعليم',
      },
      {
        afterSectionId: 'choose-school',
        eyebrow: 'القرب مهم',
        title: 'اعرض الخدمات التعليمية داخل قريتك أولًا',
        description: 'صفحات القرى تساعدك تقارن المسافة قبل اتخاذ القرار.',
        href: '/villages',
        label: 'اختار القرية',
      },
    ],
  },
  'transport-al-osairat': {
    relatedSlugs: ['villages-al-osairat-guide', 'al-osairat-landmarks', 'government-postal-services-al-osairat'],
    links: [
      {
        afterSectionId: 'railway',
        eyebrow: 'قطار وموقف ووسيلة محلية',
        title: 'اجمع خيارات التنقل المتاحة قبل المشوار',
        description: 'راجع قسم المواصلات واتصل بمقدم الخدمة لتأكيد التفاصيل المتغيرة.',
        href: '/directory/transport',
        label: 'دليل المواصلات',
      },
      {
        afterSectionId: 'transport-directory',
        eyebrow: 'بتقدم خدمة نقل؟',
        title: 'أضف مسارك ووسيلة التواصل للمراجعة',
        description: 'صفحة مخصصة للسائقين وخدمات النقل داخل نطاق العسيرات.',
        href: '/transport/add',
        label: 'إضافة وسيلة مواصلات',
      },
    ],
  },
  'markets-shopping-al-osairat': {
    relatedSlugs: ['craftsmen-al-osairat', 'agriculture-al-osairat', 'how-to-use-al-osairat-directory'],
    links: [
      {
        afterSectionId: 'market-map',
        eyebrow: 'قبل ما تنزل السوق',
        title: 'اعثر على المحلات حسب النشاط والقرية',
        description: 'اتصل لتأكيد المنتج والمخزون والسعر قبل التحرك.',
        href: '/directory/shops',
        label: 'دليل المحلات',
      },
    ],
  },
  'craftsmen-al-osairat': {
    relatedSlugs: ['markets-shopping-al-osairat', 'how-to-use-al-osairat-directory', 'villages-al-osairat-guide'],
    links: [
      {
        afterSectionId: 'shortlist',
        eyebrow: 'قائمة فنيين',
        title: 'ابحث عن الحرفة المطلوبة داخل العسيرات',
        description: 'قارن التخصص والموقع ووسيلة التواصل ثم اطلب معاينة واضحة.',
        href: '/directory/crafts',
        label: 'دليل الحرفيين',
      },
    ],
  },
  'agriculture-al-osairat': {
    relatedSlugs: ['markets-shopping-al-osairat', 'craftsmen-al-osairat', 'markaz-al-osairat'],
    links: [
      {
        afterSectionId: 'marketing-network',
        eyebrow: 'من المزرعة للخدمة',
        title: 'ابحث عن نقل ومحلات وحرفيين داخل المركز',
        description: 'الدليل يجمع حلقات محلية تساعد في الشراء والصيانة والنقل والتسويق.',
        href: '/directory',
        label: 'استكشف الدليل كاملًا',
      },
    ],
  },
  'hayah-karima-al-osairat': {
    relatedSlugs: ['markaz-al-osairat', 'government-postal-services-al-osairat', 'villages-al-osairat-guide'],
    links: [
      {
        afterSectionId: 'verify-status',
        eyebrow: 'تابع الجديد',
        title: 'راجع الأخبار المحلية مع تاريخ ومصدر كل خبر',
        description: 'صفحة الأخبار تجمع المواد المرتبطة بنطاق العسيرات من مصادر معلنة.',
        href: '/news',
        label: 'أخبار العسيرات',
      },
    ],
  },
  'government-postal-services-al-osairat': {
    relatedSlugs: ['hayah-karima-al-osairat', 'transport-al-osairat', 'how-to-use-al-osairat-directory'],
    links: [
      {
        afterSectionId: 'define-service',
        eyebrow: 'حدد الجهة',
        title: 'ابحث عن البريد والخدمات العامة حسب المكان',
        description: 'راجع العنوان ووسيلة التواصل ثم أكد الإجراء والمستندات رسميًا.',
        href: '/directory/government',
        label: 'دليل الجهات العامة',
      },
    ],
  },
  'how-to-use-al-osairat-directory': {
    relatedSlugs: ['villages-al-osairat-guide', 'markets-shopping-al-osairat', 'craftsmen-al-osairat'],
    links: [
      {
        afterSectionId: 'three-search-paths',
        eyebrow: 'جرّب بنفسك',
        title: 'كل خدمات العسيرات في واجهة بحث واحدة',
        description: 'ابحث بالكلمة أو الفئة أو القرية ووصل للصفحة المناسبة.',
        href: '/directory',
        label: 'ابدأ البحث الآن',
      },
      {
        afterSectionId: 'add-business',
        eyebrow: 'صاحب نشاط؟',
        title: 'أضف نشاطك أو طالب بملكية صفحته',
        description: 'أنشئ حسابًا وأرسل البيانات للمراجعة من لوحة واحدة.',
        href: '/account#business-submissions',
        label: 'افتح حساب النشاط',
      },
    ],
  },
};

export function getArticleJourney(slug: string) {
  return articleJourneys[slug] ?? { relatedSlugs: [], links: [] };
}
