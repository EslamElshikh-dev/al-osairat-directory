import type { Metadata } from 'next';
import Link from 'next/link';
import { BlogCard } from '@/components/blog-card';
import { BrandMark } from '@/components/site-shell';
import { blogArticles } from '@/lib/blog';
import { siteConfig } from '@/lib/site';

const title = 'مدونة العسيرات | تاريخ ومعالم وشخصيات وعائلات مركز العسيرات';
const description = 'مقالات بحثية وموسوعية عن مركز العسيرات بمحافظة سوهاج: التاريخ، القرى، المعالم، أعلام ومشاهير العسيرات، أصل التسمية والعائلات المعروفة محليًا.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/blog' },
  keywords: [
    'مدونة العسيرات', 'تاريخ العسيرات', 'مركز العسيرات', 'معالم العسيرات',
    'مشاهير العسيرات', 'عائلات العسيرات', 'قرى العسيرات', 'سوهاج',
  ],
  openGraph: {
    type: 'website',
    title,
    description,
    url: `${siteConfig.url}/blog`,
    siteName: siteConfig.name,
    locale: siteConfig.locale,
  },
  twitter: { card: 'summary', title, description },
};

export default function BlogPage() {
  const itemList = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': `${siteConfig.url}/blog#blog`,
        name: 'مدونة وموسوعة العسيرات',
        description,
        url: `${siteConfig.url}/blog`,
        inLanguage: 'ar-EG',
        publisher: {
          '@type': 'Organization',
          name: siteConfig.name,
          url: siteConfig.url,
        },
      },
      {
        '@type': 'ItemList',
        itemListElement: blogArticles.map((article, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: article.title,
          url: `${siteConfig.url}/blog/${article.slug}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'مدونة العسيرات', item: `${siteConfig.url}/blog` },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className="blog-main">
      <section className="blog-hero">
        <div className="shell blog-hero__grid">
          <div className="blog-hero__content">
            <nav className="breadcrumbs breadcrumbs--dark" aria-label="مسار التنقل">
              <Link href="/">الرئيسية</Link><span>/</span><span>المدونة</span>
            </nav>
            <span className="eyebrow">موسوعة المكان والناس</span>
            <h1>حكايات <em>العسيرات</em>… موثقة ومكتوبة لتبقى.</h1>
            <p>
              مساحة بحثية محلية تجمع التاريخ والجغرافيا والمعالم والشخصيات والعائلات،
              بصياغة عربية واضحة ومصادر يمكن الرجوع إليها بدل أن تضيع المعلومة بين الروايات المتفرقة.
            </p>
            <div className="blog-hero__actions">
              <a href="#articles" className="button button--light">ابدأ القراءة</a>
              <Link href="/villages" className="button button--outline-light">استكشف القرى</Link>
            </div>
          </div>
          <aside className="blog-hero__seal" aria-label="هوية مدونة العسيرات">
            <span className="blog-hero__seal-mark" aria-hidden="true"><BrandMark /></span>
            <span>مدونة</span>
            <strong>العسيرات</strong>
            <small>تاريخ · مكان · ناس</small>
          </aside>
        </div>
      </section>

      <section className="section shell blog-intro">
        <div>
          <span className="eyebrow eyebrow--dark">لماذا هذه المدونة؟</span>
          <h2>من دليل خدمات إلى مرجع محلي متكامل</h2>
        </div>
        <div className="blog-intro__copy">
          <p>
            دليل العسيرات لا يكتفي بعرض أرقام الهواتف والعناوين. الهدف الأوسع هو بناء ذاكرة رقمية للمركز:
            ما الذي نعرفه عن نشأته؟ ما القرى التي تكوّنه؟ من أبرز أبنائه؟ وكيف تشكلت أسماء الأماكن والعائلات؟
          </p>
          <p>
            لذلك تُكتب المقالات بمنهج يفرق بين المصادر الرسمية والصحفية، وبين الروايات المحلية والأنساب التي تحتاج إلى
            قدر أكبر من التحفظ والتحقق.
          </p>
        </div>
      </section>

      <section id="articles" className="section section--muted blog-listing-section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow eyebrow--dark">إصدار البداية</span>
              <h2>خمسة ملفات موسوعية عن مركز العسيرات</h2>
            </div>
            <span className="blog-count">{blogArticles.length} مقالات</span>
          </div>
          <div className="blog-grid">
            {blogArticles.map((article, index) => (
              <BlogCard key={article.slug} article={article} featured={index === 0} />
            ))}
          </div>
        </div>
      </section>

      <section className="section shell blog-editorial-note">
        <div className="blog-editorial-note__mark" aria-hidden="true"><BrandMark compact /></div>
        <div>
          <span className="eyebrow eyebrow--dark">سياسة التحرير</span>
          <h2>المعلومة الموثقة أولًا… والرواية المحلية تُذكر بصفتها رواية.</h2>
          <p>
            عندما تتعارض المصادر أو لا توجد وثيقة حاسمة، نعرض الاحتمالات بوضوح ولا نحولها إلى حقيقة قطعية.
            ويمكن تحديث أي مقال عند ظهور مصدر أقوى أو وثيقة تاريخية جديدة.
          </p>
        </div>
        <Link href="/directory" className="button button--primary">استكشف دليل الخدمات</Link>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
    </main>
  );
}
