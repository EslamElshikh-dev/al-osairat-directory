export type DeveloperProjectCategory = 'local' | 'business' | 'product';
export type DeveloperProjectFilter = 'all' | DeveloperProjectCategory;
export type DeveloperProjectTheme = 'usayrat' | 'naqada' | 'tawod' | 'sama' | 'bowdy';

export type DeveloperProject = {
  title: string;
  code: string;
  href: string;
  external: boolean;
  description: string;
  image: string;
  imageAlt: string;
  theme: DeveloperProjectTheme;
  brand: string;
  headline: readonly [string, string];
  action: string;
  category: DeveloperProjectCategory;
  highlights: readonly string[];
};

export const developerProjectFilters: ReadonlyArray<{ id: DeveloperProjectFilter; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'local', label: 'من البلد' },
  { id: 'business', label: 'شركات' },
  { id: 'product', label: 'تجارب' },
];

export const developerProjects: readonly DeveloperProject[] = [
  {
    title: 'دليل وموسوعة العسيرات',
    code: 'LOCAL / SOHAG',
    href: '/',
    external: false,
    description: 'دليل محلي ينظّم خدمات مركز العسيرات وقراه ونجوعه في مساحة واحدة، ويجعل الوصول إلى المعلومة المتعلقة بالمنطقة أوضح لأهلها. يبدأ به عرض الأعمال لأن فكرته قريبة من دليل نقادة: حضور رقمي للمكان يساعد الناس على الوصول لما يخص بلدهم.',
    image: '/images/directory/hero-al-osairat.webp',
    imageAlt: 'مشهد تعبيري لقرى العسيرات ضمن دليل العسيرات',
    theme: 'usayrat',
    brand: 'العسيرات · سوهاج',
    headline: ['من البلد،', 'ولأهلها.'],
    action: 'افتح الدليل ↗',
    category: 'local',
    highlights: ['دليل محلي', 'قرى ونجوع', 'بحث'],
  },
  {
    title: 'دليل نقادة',
    code: 'LOCAL / QENA',
    href: 'https://naqada-directory.vercel.app/',
    external: true,
    description: 'مساحة تجمع خدمات نقادة وقراها وأخبارها وحكايات أهلها. بعد دليل العسيرات، تأتي نقادة لتكمل الاهتمام نفسه بالمكان؛ تجربة تسهّل الوصول إلى المسارات المحلية وتعرض المعلومات بطريقة مرتبة وقابلة للتحديث.',
    image: '/images/developer/naqada-city.webp',
    imageAlt: 'مشهد من مدينة نقادة ضمن مشروع دليل نقادة',
    theme: 'naqada',
    brand: 'نقادة · قنا',
    headline: ['المعلومة قريبة،', 'يا ابن البلد.'],
    action: 'استكشف الدليل ←',
    category: 'local',
    highlights: ['خدمات', 'حكايات', 'مجتمع'],
  },
  {
    title: 'شركة تعاود للمقاولات',
    code: 'BUSINESS / RIYADH',
    href: 'https://tawodco.com/',
    external: true,
    description: 'موقع لشركة تعاود للمقاولات العامة يعرّف الزائر بالشركة وخدماتها ومجالات عملها. يقدّم المعلومات في مسار واضح، ويقرّب الوصول إلى وسائل التواصل، ضمن الأعمال التي تربط حضور الشركة على الأرض بحضورها الرقمي.',
    image: '/images/developer/tawod.webp',
    imageAlt: 'لقطة فعلية من موقع شركة تعاود للمقاولات',
    theme: 'tawod',
    brand: 'TAWOD',
    headline: ['شغل على الأرض،', 'وحضور على الويب.'],
    action: 'زيارة المشروع ↗',
    category: 'business',
    highlights: ['مقاولات', 'محتوى', 'تجربة'],
  },
  {
    title: 'مركز سما سكان للأشعة',
    code: 'HEALTH / RIYADH',
    href: 'https://samascan.vercel.app/',
    external: true,
    description: 'موقع لمعامل سما سكان للأشعة التشخيصية في الرياض، يعرض الخدمات والمعلومات ذات الصلة بطريقة مرتبة. يتيح للزائر التعرف على تفاصيل الفحوص والوصول إلى وسائل التواصل بخطوات واضحة تناسب طبيعة الخدمة الصحية.',
    image: '/images/developer/sama-scan.webp',
    imageAlt: 'لقطة فعلية من موقع مركز سما سكان للأشعة',
    theme: 'sama',
    brand: 'SAMA SCAN',
    headline: ['الوضوح', 'جزء من العناية.'],
    action: 'زيارة المشروع ↗',
    category: 'product',
    highlights: ['صحة', 'سهولة وصول', 'خدمات'],
  },
  {
    title: 'Bowdy Labs',
    code: 'TECH / AI',
    href: 'https://bowdylabs.com/',
    external: true,
    description: 'موقع لشركة باودي لابز للذكاء الاصطناعي، يعرّف بمجال عملها ويقدّم محتواها لجمهورها العربي في واجهة واضحة ومتجاوبة. تجربة من قطاع مختلف تكمل تنوع الأعمال المعروضة بين المشروعات المحلية والشركات والتقنية.',
    image: '/images/developer/bowdy-labs.webp',
    imageAlt: 'لقطة فعلية من موقع شركة Bowdy Labs',
    theme: 'bowdy',
    brand: 'BOWDY LABS',
    headline: ['فكرة بكرة،', 'قدّامك النهارده.'],
    action: 'زيارة المشروع ↗',
    category: 'product',
    highlights: ['ذكاء اصطناعي', 'هوية', 'منتج'],
  },
];
