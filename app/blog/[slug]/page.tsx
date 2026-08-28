import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BlogCard } from '@/components/blog-card';
import { BrandMark } from '@/components/site-shell';
import { blogArticles, blogBySlug } from '@/lib/blog';
import { siteConfig } from '@/lib/site';

const authorName = 'المهندس إسلام الشيخ';
const authorUrl = 'https://www.eslam-elshikh.com/about/';

export function generateStaticParams() {
  return blogArticles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = blogBySlug[slug];
  if (!article) return {};

  return {
    title: article.seoTitle,
    description: article.description,
    authors: [{ name: authorName, url: authorUrl }],
    alternates: { canonical: `/blog/${article.slug}` },
    keywords: [article.category, 'العسيرات', 'مركز العسيرات', 'سوهاج', article.eyebrow],
    openGraph: {
      type: 'article',
      title: article.seoTitle,
      description: article.description,
      url: `${siteConfig.url}/blog/${article.slug}`,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [authorName],
      section: article.category,
    },
    twitter: {
      card: 'summary',
      title: article.seoTitle,
      description: article.description,
    },
  };
}

const formatDate = (value: string) => new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(`${value}T00:00:00Z`));

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = blogBySlug[slug];
  if (!article) notFound();

  const related = blogArticles.filter((item) => item.slug !== article.slug).slice(0, 3);
  const articleUrl = `${siteConfig.url}/blog/${article.slug}`;
  const faqGroup = `article-faq-${article.slug}`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${articleUrl}#article`,
        headline: article.title,
        description: article.description,
        url: articleUrl,
        mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        inLanguage: 'ar-EG',
        articleSection: article.category,
        articleBody: [article.lead, article.highlight, ...article.sections.flatMap((section) => section.paragraphs)].join(' '),
        author: {
          '@type': 'Person',
          name: authorName,
          url: authorUrl,
        },
        publisher: {
          '@type': 'Organization',
          name: siteConfig.name,
          url: siteConfig.url,
          logo: {
            '@type': 'ImageObject',
            url: `${siteConfig.url}/icon.svg`,
          },
        },
        isPartOf: {
          '@type': 'Blog',
          name: 'مدونة وموسوعة العسيرات',
          url: `${siteConfig.url}/blog`,
        },
        about: {
          '@type': 'Place',
          name: 'مركز العسيرات، سوهاج، مصر',
        },
        citation: article.sources.map((source) => source.url),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'مدونة العسيرات', item: `${siteConfig.url}/blog` },
          { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: article.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };

  return (
    <main id="main-content" className="article-page">
      <header className="article-hero">
        <div className="shell article-hero__shell">
          <nav className="breadcrumbs breadcrumbs--dark" aria-label="مسار التنقل">
            <Link href="/">الرئيسية</Link><span>/</span>
            <Link href="/blog">المدونة</Link><span>/</span>
            <span>{article.category}</span>
          </nav>
          <div className="article-hero__meta">
            <span>{article.category}</span>
            <span aria-hidden="true">•</span>
            <span>{article.readingTime}</span>
            <span aria-hidden="true">•</span>
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          </div>
          <h1>{article.title}</h1>
          <p className="article-hero__lead">{article.lead}</p>
          <div className="article-hero__author">
            <span className="article-hero__author-mark" aria-hidden="true"><BrandMark compact /></span>
            <span>إعداد وتحرير</span>
            <a href={authorUrl} target="_blank" rel="noreferrer">{authorName}</a>
          </div>
        </div>
      </header>

      <div className="shell article-layout">
        <aside className="article-toc" aria-label="محتويات المقال">
          <span className="article-toc__label">في هذا المقال</span>
          <nav>
            {article.sections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>{section.heading}
              </a>
            ))}
            <a href="#faq"><span>؟</span>الأسئلة الشائعة</a>
            <a href="#sources"><span>↗</span>المصادر</a>
          </nav>
          <Link href="/blog" className="article-toc__back">← كل مقالات العسيرات</Link>
        </aside>

        <article className="article-content">
          <div className="article-highlight">
            <span className="article-highlight__icon" aria-hidden="true"><BrandMark compact /></span>
            <div><strong>الخلاصة السريعة</strong><p>{article.highlight}</p></div>
          </div>

          {article.sections.map((section) => (
            <section key={section.id} id={section.id} className="article-section">
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              {section.bullets?.length ? (
                <ul className="article-list">
                  {section.bullets.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : null}
            </section>
          ))}

          <section id="faq" className="article-section article-faq" aria-labelledby="article-faq-title">
            <span className="eyebrow eyebrow--dark">أسئلة شائعة</span>
            <h2 id="article-faq-title">أسئلة مرتبطة بموضوع المقال</h2>
            <div className="article-faq__list">
              {article.faq.map((item, index) => (
                <details key={item.question} name={faqGroup} className="article-faq__item" open={index === 0}>
                  <summary>
                    <span>{item.question}</span>
                    <span aria-hidden="true">+</span>
                  </summary>
                  <div><p>{item.answer}</p></div>
                </details>
              ))}
            </div>
          </section>

          <section id="sources" className="article-section article-sources" aria-labelledby="article-sources-title">
            <span className="eyebrow eyebrow--dark">مصادر ومراجع</span>
            <h2 id="article-sources-title">من أين جاءت معلومات هذا المقال؟</h2>
            <p className="article-sources__intro">
              جُمعت المادة من مصادر رسمية وصحفية وأكاديمية ومحلية. وتُعامل مصادر الأنساب والروايات المحلية باعتبارها
              مادة مرجعية تحتاج إلى المقارنة، وليست بديلًا عن الوثيقة الرسمية.
            </p>
            <ol>
              {article.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noreferrer">{source.label}<span aria-hidden="true">↗</span></a>
                  {source.note ? <small>{source.note}</small> : null}
                </li>
              ))}
            </ol>
          </section>

          <div className="article-cta">
            <div>
              <span className="eyebrow eyebrow--light">من المعرفة إلى الخدمة</span>
              <h2>تبحث عن طبيب أو صيدلية أو محل أو حرفي داخل العسيرات؟</h2>
              <p>انتقل من المقال إلى الدليل المحلي وابحث بالاسم أو الخدمة أو القرية.</p>
            </div>
            <div className="article-cta__actions">
              <Link href="/directory" className="button button--light">استكشف الدليل</Link>
              <Link href="/villages" className="button button--outline-light">قرى العسيرات</Link>
            </div>
          </div>
        </article>
      </div>

      <section className="section section--muted related-articles">
        <div className="shell">
          <div className="section-heading">
            <div><span className="eyebrow eyebrow--dark">تابع القراءة</span><h2>مقالات أخرى من موسوعة العسيرات</h2></div>
            <Link href="/blog" className="text-link">كل المقالات</Link>
          </div>
          <div className="blog-grid blog-grid--related">
            {related.map((item) => <BlogCard key={item.slug} article={item} />)}
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </main>
  );
}
