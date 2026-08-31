import { blogArticles as baseBlogArticles, type BlogArticle } from './blog';
import { expandedFamilyArticle } from './family-article';

const famousPeopleArticle = (article: BlogArticle): BlogArticle => ({
  ...article,
  description: 'ملف تعريفي بأبرز أعلام مركز العسيرات في العلم والأزهر والأدب والثقافة والعمل العام، ويضم الشيخ محمد موسى حمد من أعلام آل حمد بجزيرة أولاد حمزة إلى جانب شخصيات معاصرة وموثقة.',
  readingTime: '9 دقائق قراءة',
  updatedAt: '2026-08-28',
  highlight: 'يضم الملف أسماء موثقة بمصادر صحفية وأكاديمية، إلى جانب شخصيات راسخة في الذاكرة المحلية. وعندما تكون السيرة منقولة من أهل المنطقة من دون مادة أرشيفية رقمية كافية، نذكر ذلك صراحة بدل اختراع تفاصيل غير موثقة.',
  sections: [
    {
      id: 'mohamed-mousa-hamd',
      heading: 'الشيخ محمد موسى حمد – عالم وفقيه من أعلام آل حمد والعسيرات',
      paragraphs: [
        'يُذكر الشيخ الجليل محمد موسى حمد في الذاكرة المحلية لعائلة آل حمد وجزيرة أولاد حمزة بوصفه عالمًا جليلًا وفقيهًا وعلامة من أعلام العائلة ومركز العسيرات. ويأتي إدراجه في هذا الملف بناءً على المعلومة المحلية المباشرة المقدمة للدليل من أبناء العائلة والمنطقة.',
        'لم نعثر حتى الآن على سيرة أرشيفية رقمية كافية تسمح لنا بإضافة تواريخ الميلاد والوفاة أو المناصب أو المؤلفات من دون مخاطرة بالخطأ؛ لذلك نثبت مكانته العلمية كما تتناقلها الذاكرة المحلية، ونترك هذه الفقرة مفتوحة لاستقبال وثائق أو صور أو شهادات أو مراجع مكتوبة يمكن أن توسع سيرته لاحقًا بصورة تليق باسمه.'
      ]
    },
    ...article.sections,
  ],
  faq: [
    {
      question: 'من هو الشيخ محمد موسى حمد؟',
      answer: 'يُذكر محليًا بوصفه عالمًا جليلًا وفقيهًا وعلامة من أعلام عائلة آل حمد بجزيرة أولاد حمزة ومن أعلام مركز العسيرات. ويواصل الدليل البحث عن مادة أرشيفية مكتوبة لتوسيع سيرته من دون إضافة تفاصيل غير موثقة.'
    },
    ...article.faq,
  ],
});

export const blogArticles: BlogArticle[] = baseBlogArticles.map((article) => {
  if (article.slug === 'famous-families-al-osairat') return expandedFamilyArticle(article);
  if (article.slug === 'al-osairat-famous-people') return famousPeopleArticle(article);
  return article;
});

export const blogBySlug = Object.fromEntries(
  blogArticles.map((article) => [article.slug, article]),
) as Record<string, BlogArticle>;
