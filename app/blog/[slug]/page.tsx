import type { Metadata } from 'next';
import { Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleReadingProgress } from '@/components/article-reading-progress';
import { BlogCard } from '@/components/blog-card';
import { MemberReviews } from '@/components/member-reviews';
import { BrandMark } from '@/components/site-shell';
import { blogArticles, blogBySlug } from '@/lib/blog-published';
import { getArticleJourney } from '@/lib/blog-navigation';
import { blogSourceKindLabels, classifyBlogSource, summarizeBlogSources } from '@/lib/blog-source-trust';
import { buildArticleMetadata } from '@/lib/metadata';
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
    ...buildArticleMetadata({
      title: article.seoTitle,
      description: article.description,
      path: `/blog/${article.slug}`,
      imageAlt: `${article.title} - مدونة دليل العسيرات`,
      imageUrl: article.image,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [authorName],
      section: article.category,
    }),
    authors: [{ name: authorName, url: authorUrl }],
    keywords: [article.category, 'العسيرات', 'مركز العسيرات', 'سوهاج', article.eyebrow],
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

  const journey = getArticleJourney(article.slug);
  const related = journey.relatedSlugs
    .map((relatedSlug) => blogBySlug[relatedSlug])
    .filter((item): item is (typeof blogArticles)[number] => Boolean(item))
    .slice(0, 3);
  const articleIndex = blogArticles.findIndex((item) => item.slug === article.slug);
  const previousArticle = articleIndex > 0 ? blogArticles[articleIndex - 1] : null;
  const nextArticle = articleIndex >= 0 && articleIndex < blogArticles.length - 1
    ? blogArticles[articleIndex + 1]
    : null;
  const articleUrl = `${siteConfig.url}/blog/${article.slug}`;
  const faqGroup = `article-faq-${article.slug}`;
  const sectionSources = article.sections.flatMap((section) => [
    ...(section.entries?.flatMap((entry) => entry.sourceUrl ? [entry.sourceUrl] : []) ?? []),
    ...(section.media?.sourceUrl ? [section.media.sourceUrl] : []),
  ]);
  const citations = [...new Set([...article.sources.map((source) => source.url), ...sectionSources])];
  const sourceSummary = summarizeBlogSources(citations);
  const sourceKinds = Object.entries(sourceSummary.counts).filter(([, count]) => count > 0).map(([kind]) => kind);
  const articleBody = [
    article.lead,
    article.highlight,
    ...article.sections.flatMap((section) => [
      ...section.paragraphs,
      ...(section.bullets ?? []),
      ...(section.entries?.map((entry) => `${entry.name}: ${entry.description}`) ?? []),
    ]),
  ].join(' ');

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
        image: {
          '@type': 'ImageObject',
          url: `${siteConfig.url}${article.image}`,
          caption: article.imageAlt,
        },
        articleBody,
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
        citation: citations,
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
      <ArticleReadingProgress />
      <header className="article-hero">
        <div className="shell article-hero__shell article-hero__shell--visual">
          <div className="article-hero__copy">
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
          <figure className="article-hero__visual">
            <Image src={article.image} alt={article.imageAlt} fill priority sizes="(max-width: 860px) 100vw, 42vw" />
            <span className="article-hero__visual-shade" aria-hidden="true" />
            <figcaption>صورة تعبيرية أُعدت خصيصًا لمحتوى المقال</figcaption>
          </figure>
        </div>
      </header>

      <section className="article-evidence shell" aria-label="بيانات مراجعة المقال">
        <div className="article-evidence__item">
          <span>آخر مراجعة</span>
          <strong><time dateTime={article.updatedAt}>{formatDate(article.updatedAt)}</time></strong>
        </div>
        <div className="article-evidence__item">
          <span>المراجع والروابط</span>
          <strong>{sourceSummary.total.toLocaleString('ar-EG')} مرجعًا</strong>
        </div>
        <div className="article-evidence__item article-evidence__item--wide">
          <span>أنواع المصادر</span>
          <div className="article-evidence__chips">
            {sourceKinds.map((kind) => <b key={kind}>{blogSourceKindLabels[kind as keyof typeof blogSourceKindLabels]}</b>)}
          </div>
        </div>
        <p className="article-evidence__note">التصنيف يصف نوع المصدر فقط، ولا يعني أن كل معلومة فيه صحيحة تلقائيًا؛ لذلك تُقارن الروايات المحلية بالمصادر الأقوى متى توافرت.</p>
      </section>

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

          {article.sections.map((section) => {
            const journeyLink = journey.links.find((item) => item.afterSectionId === section.id);

            return (
              <Fragment key={section.id}>
                <section id={section.id} className="article-section">
                  <h2>{section.heading}</h2>
                  {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                  {section.media ? (
                    <figure className="article-section-media">
                      <div className="article-section-media__image">
                        <Image
                          src={section.media.image}
                          alt={section.media.alt}
                          fill
                          sizes="(max-width: 760px) 100vw, 760px"
                          unoptimized={section.media.image.endsWith('.svg')}
                        />
                      </div>
                      <figcaption>
                        <span>{section.media.caption}</span>
                        {section.media.sourceUrl && section.media.sourceLabel ? (
                          <a href={section.media.sourceUrl} target="_blank" rel="noreferrer">
                            {section.media.sourceLabel}<span aria-hidden="true">↗</span>
                          </a>
                        ) : null}
                      </figcaption>
                    </figure>
                  ) : null}
                  {section.bullets?.length ? (
                    <ul className="article-list">
                      {section.bullets.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  ) : null}
                  {section.entries?.length ? (
                    <div className="article-entry-grid">
                      {section.entries.map((entry) => (
                        <div key={entry.name} className="article-entry">
                          <h3>{entry.name}</h3>
                          <p>{entry.description}</p>
                          {entry.sourceUrl && entry.sourceLabel ? (
                            <a href={entry.sourceUrl} target="_blank" rel="noreferrer">
                              {entry.sourceLabel}<span aria-hidden="true">↗</span>
                            </a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>

                {journeyLink ? (
                  <aside className="article-journey" aria-label="قراءة مرتبطة">
                    <div>
                      <span>{journeyLink.eyebrow}</span>
                      <strong>{journeyLink.title}</strong>
                      <p>{journeyLink.description}</p>
                    </div>
                    <Link href={journeyLink.href}>{journeyLink.label}<span aria-hidden="true">←</span></Link>
                  </aside>
                ) : null}
              </Fragment>
            );
          })}

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

          <MemberReviews
            targetType="article"
            targetKey={article.slug}
            eyebrow="تقييم القراء"
            title="هل كان هذا المقال مفيدًا؟"
            description="شارك تقييمك وانطباعك عن المحتوى. تظهر الآراء من أعضاء مسجلين فقط للمساعدة في تطوير جودة الموسوعة المحلية."
            prompt="قيّم المقال واكتب ملاحظتك"
            className="member-reviews--article"
          />

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

          {(previousArticle || nextArticle) ? (
            <nav className="article-sequence" aria-label="التنقل بين مقالات الموسوعة">
              {previousArticle ? (
                <Link href={`/blog/${previousArticle.slug}`} className="article-sequence__item">
                  <span>المقال السابق</span>
                  <strong>{previousArticle.title}</strong>
                </Link>
              ) : <span />}
              {nextArticle ? (
                <Link href={`/blog/${nextArticle.slug}`} className="article-sequence__item article-sequence__item--next">
                  <span>المقال التالي</span>
                  <strong>{nextArticle.title}</strong>
                </Link>
              ) : null}
            </nav>
          ) : null}
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
