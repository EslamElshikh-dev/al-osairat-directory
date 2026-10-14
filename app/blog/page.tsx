import { jsonLdStringify } from '@/lib/json-ld';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from '@/components/site-image';
import { BlogCard } from '@/components/blog-card';
import { BlogDiscoveryControls } from '@/components/blog-discovery-controls';
import { BrandMark } from '@/components/brand-mark';
import { blogArticles } from '@/lib/blog-published';
import { getBlogDiscoveryTopic, normalizeBlogSearchText } from '@/lib/blog-discovery';
import { buildPageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/site';
import styles from './editorial.module.css';

const title = 'مدونة العسيرات: التاريخ والقرى ودليل الخدمات';
const description = 'مقالات موثقة وأدلة عملية عن مركز العسيرات بمحافظة سوهاج: التاريخ والقرى والمعالم والشخصيات والصحة والتعليم والمواصلات والأسواق والخدمات المحلية.';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title,
    description,
    path: '/blog',
    imageAlt: 'مدونة وموسوعة العسيرات',
  }),
  keywords: [
    'مدونة العسيرات', 'تاريخ العسيرات', 'مركز العسيرات', 'معالم العسيرات',
    'مشاهير العسيرات', 'عائلات العسيرات', 'قرى العسيرات', 'خدمات العسيرات',
    'مواصلات العسيرات', 'مدارس العسيرات', 'سوهاج',
  ],
};

export default function BlogPage() {
  const coverArticle = blogArticles[0];
  const blogEditorialMetrics = {
    articles: blogArticles.length,
    sections: blogArticles.reduce((sum, article) => sum + article.sections.length, 0),
    questions: blogArticles.reduce((sum, article) => sum + article.faq.length, 0),
  };

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
          '@id': `${siteConfig.url}#organization`,
          name: siteConfig.name,
          url: siteConfig.url,
          logo: {
            '@type': 'ImageObject',
            url: `${siteConfig.url}/brand/usayrat-rider-logo.webp`,
          },
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
    <main id="main-content" className={`blog-main ${styles.journal}`}>
      <section className={styles.cover} aria-labelledby="blog-cover-title">
        <div className="shell">
          <nav className={`breadcrumbs ${styles.breadcrumbs}`} aria-label="مسار التنقل">
            <Link prefetch={false} href="/">الرئيسية</Link><span>/</span><span>المدونة</span>
          </nav>
          <div className={styles.masthead}>
            <div><span>ذاكرة المكان… وحكايات الناس</span><h1 id="blog-cover-title">حكايات <em>العسيرات.</em></h1><p>بلد تستاهل نعرفها أكتر. اقرأ عن قراها وناسها، وخُد من الحكاية طريقًا لمشوارك.</p></div>
            <a href="#articles" className={styles.browse}>اختار حكايتك <span aria-hidden="true">↓</span></a>
          </div>
          <div className={styles.coverGrid}>
            <Link prefetch={false} href={`/blog/${coverArticle.slug}`} className={styles.coverPhoto}>
              <Image src={coverArticle.image} alt={coverArticle.imageAlt} fill preload sizes="(max-width: 760px) 92vw, (max-width: 1100px) 60vw, 750px" />
              <span className={styles.photoLabel}>صورة تعبيرية</span>
              <div className={styles.coverCaption}><span>{coverArticle.category} · {coverArticle.readingTime}</span><h2>{coverArticle.title}</h2><span className={styles.coverCta}>افتح أول صفحة <b aria-hidden="true">←</b></span></div>
            </Link>
            <aside className={styles.shelf} aria-label="مسارات قراءة مختارة">
              <div className={styles.shelfTitle}><BrandMark compact /><span>على رف القراءة<strong>مكان. تاريخ. ناس.</strong></span></div>
              <nav>{blogArticles.slice(1, 4).map((article, index) => <Link prefetch={false} href={`/blog/${article.slug}`} key={article.slug}><span className={styles.shelfNumber}>{(index + 1).toLocaleString('ar-EG')}</span><span><small>{article.category}</small><strong>{article.title}</strong><em>{article.readingTime} <b aria-hidden="true">←</b></em></span></Link>)}</nav>
              <Link prefetch={false} href="/villages" className={styles.shelfVillage}>كمّل الحكاية من قريتك <b aria-hidden="true">←</b></Link>
            </aside>
          </div>
        </div>
      </section>

      <section className="shell blog-compass" aria-label="بوصلة محتوى مدونة العسيرات">
        <div className="blog-compass__intro">
          <span>بوصلة القراءة</span>
          <strong>اقرأ حسب فضولك… مش حسب ترتيب النشر.</strong>
        </div>
        <div className="blog-compass__metrics">
          <span><b>{blogEditorialMetrics.articles.toLocaleString('ar-EG')}</b><small>ملفًا ومقالًا</small></span>
          <span><b>{blogEditorialMetrics.sections.toLocaleString('ar-EG')}</b><small>محورًا بحثيًا</small></span>
          <span><b>{blogEditorialMetrics.questions.toLocaleString('ar-EG')}</b><small>سؤالًا مباشرًا</small></span>
        </div>
        <Link href="#articles" className="blog-compass__cta">اختار موضوعك <b aria-hidden="true">↓</b></Link>
      </section>

      <section id="articles" className="section section--muted blog-listing-section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow eyebrow--dark">موسوعة متجددة</span>
              <h2>ملفات بحثية عن مركز العسيرات</h2>
            </div>
            <span className="blog-count">{blogArticles.length.toLocaleString('ar-EG')} مقالات</span>
          </div>
          <BlogDiscoveryControls total={blogArticles.length} />
          <div className="blog-grid blog-grid--discoverable">
            {blogArticles.map((article, index) => {
              const searchableText = normalizeBlogSearchText([
                article.title,
                article.description,
                article.category,
                article.eyebrow,
                ...article.sections.map((section) => section.heading),
                ...article.faq.map((item) => item.question),
              ].join(' '));

              return (
                <div
                  key={article.slug}
                  className={`blog-discovery-card-shell${index === 0 ? ' blog-discovery-card-shell--featured' : ''}`}
                  data-blog-discovery-card
                  data-blog-topic={getBlogDiscoveryTopic(article.slug)}
                  data-blog-search={searchableText}
                >
                  <BlogCard article={article} featured={index === 0} />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section shell blog-intro">
        <div>
          <span className="eyebrow eyebrow--dark">لماذا هذه المدونة؟</span>
          <h2>من دليل خدمات إلى مرجع محلي متكامل</h2>
        </div>
        <div className="blog-intro__copy">
          <p>
            دليل العسيرات لا يكتفي بعرض أرقام الهواتف والعناوين. الهدف الأوسع هو بناء ذاكرة رقمية ودليل حياة يومية للمركز:
            ما الذي نعرفه عن نشأته؟ ما القرى التي تكوّنه؟ وكيف نصل إلى خدمة موثوقة ونخطط مشوارنا بصورة أذكى؟
          </p>
          <p>
            لذلك تُكتب المقالات بمنهج يفرق بين المصادر الرسمية والصحفية والروايات المحلية، ويحوّل المعلومة إلى خطوات
            عملية مع تنبيه واضح عندما تتغير المواعيد أو الأسعار أو تحتاج إلى جهة مختصة.
          </p>
        </div>
      </section>

      <section className="section shell blog-start-here" aria-labelledby="blog-start-here-title">
        <div className="blog-start-here__heading">
          <span className="eyebrow eyebrow--dark">ابدأ من هنا</span>
          <h2 id="blog-start-here-title">اختار الحكاية اللي تناسبك بدل ما تلف بين المقالات</h2>
          <p>ثلاث مسارات قراءة بسيطة: افهم المكان، ارجع للتاريخ، أو ادخل مباشرة في الناس والعائلات.</p>
        </div>
        <div className="blog-start-here__grid">
          <Link href="/blog/markaz-al-osairat" className="blog-start-card">
            <span>01</span>
            <small>لو أول مرة تقرأ عن المركز</small>
            <strong>ابدأ بمركز العسيرات: القرى والسكان والخدمات</strong>
            <p>يعطيك الصورة العامة أولًا، وبعدها أي مقال ثاني هيبقى أوضح.</p>
          </Link>
          <Link href="/blog/origin-name-al-osairat" className="blog-start-card">
            <span>02</span>
            <small>لو بتحب أصل الحكاية</small>
            <strong>ابدأ باسم العسيرات وطوخ الجبل والروايات التاريخية</strong>
            <p>مسار مناسب لو سؤالك الأول دائمًا: «طيب الاسم ده جه منين؟»</p>
          </Link>
          <Link href="/blog/famous-families-al-osairat" className="blog-start-card">
            <span>03</span>
            <small>لو داخل على الناس والذاكرة المحلية</small>
            <strong>ابدأ بالعائلات ثم انتقل إلى الأعلام والشخصيات</strong>
            <p>مع فرق واضح بين وجود الاسم في المصدر وبين إثبات النسب أو الأقدمية.</p>
          </Link>
        </div>
      </section>

      <section className="shell seo-growth-hub seo-growth-hub--compact" aria-labelledby="blog-discovery-title">
        <div className="seo-growth-hub__heading">
          <span>استكشف مركز العسيرات</span>
          <h2 id="blog-discovery-title">من المعرفة إلى الخدمة والمكان</h2>
          <p>روابط مباشرة لأهم صفحات المركز والقرى والخدمات حتى تصل من المعلومة العامة إلى الجهة أو النشاط المحلي بأقل عدد من الخطوات.</p>
        </div>
        <nav className="seo-growth-hub__links" aria-label="روابط استكشاف العسيرات">
          <Link href="/blog/markaz-al-osairat"><span>مركز العسيرات بسوهاج</span><small>التاريخ والقرى والخدمات</small></Link>
          <Link href="/villages"><span>قرى مركز العسيرات</span><small>استكشف القرى والتوابع</small></Link>
          <Link href="/directory/education"><span>المدارس والتعليم</span><small>دليل المؤسسات التعليمية</small></Link>
          <Link href="/directory/doctors"><span>أطباء العسيرات</span><small>التخصصات والعيادات</small></Link>
          <Link href="/directory/pharmacies"><span>صيدليات العسيرات</span><small>الصيدليات وبيانات التواصل</small></Link>
          <Link href="/directory/community"><span>الدواوين والمنادر</span><small>المجتمع المحلي والعائلات</small></Link>
        </nav>
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

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(itemList) }} />
    </main>
  );
}
