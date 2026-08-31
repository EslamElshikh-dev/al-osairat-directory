import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NewsCard } from '@/components/news-card';
import { BrandMark } from '@/components/site-shell';
import { buildArticleMetadata, buildPageMetadata } from '@/lib/metadata';
import { getGeneratedNewsEditorial } from '@/lib/news-editorial';
import {
  getLocalNews,
  getLocalNewsItem,
  isFullNewsArticle,
  newsItemPath,
} from '@/lib/news';
import { siteConfig } from '@/lib/site';
import styles from './news-detail.module.css';

export const revalidate = 1800;
export const dynamicParams = true;

type NewsDetailPageProps = {
  params: Promise<{ id: string }>;
};

const dateFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Africa/Cairo',
});

function detailDescription(title: string, excerpt?: string) {
  const value = excerpt?.trim() || title;
  return value.length > 160 ? `${value.slice(0, 157).replace(/\s+\S*$/, '')}…` : value;
}

export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getLocalNewsItem(id);
  if (!item) return { title: 'الخبر غير متاح', robots: { index: false, follow: true } };

  const path = newsItemPath(item);
  const description = detailDescription(item.title, item.sourceExcerpt || item.summary);
  const fullArticle = isFullNewsArticle(item);

  if (fullArticle && item.editorial) {
    return {
      ...buildArticleMetadata({
        title: item.title,
        description,
        path,
        imageAlt: `${item.title} - أخبار العسيرات`,
        publishedTime: item.publishedAt,
        modifiedTime: item.editorial.updatedAt,
        authors: [item.editorial.author],
        section: item.topic,
      }),
      authors: [{ name: item.editorial.author }],
    };
  }

  return {
    ...buildPageMetadata({
      title: item.title,
      description,
      path,
      noIndex: true,
      imageAlt: `${item.title} - موجز من أخبار العسيرات`,
    }),
    alternates: { canonical: item.url },
  };
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { id } = await params;
  const [item, feed] = await Promise.all([getLocalNewsItem(id), getLocalNews(16)]);
  if (!item) notFound();

  const fullArticle = isFullNewsArticle(item);
  const excerpt = item.sourceExcerpt || item.summary;
  const generatedEditorial = fullArticle
    ? undefined
    : item.generatedEditorial || (!item.persisted ? await getGeneratedNewsEditorial(item) : undefined);
  const sourceDigest = fullArticle || generatedEditorial ? undefined : item.sourceDigest;
  const heroSummary = generatedEditorial?.lead || sourceDigest?.lead || excerpt;
  const pageUrl = `${siteConfig.url}${newsItemPath(item)}`;
  const related = feed.items
    .filter((candidate) => candidate.id !== item.id)
    .toSorted((a, b) => {
      const aScore = Number(a.topic === item.topic) * 2 + Number(a.village === item.village);
      const bScore = Number(b.topic === item.topic) * 2 + Number(b.village === item.village);
      return bScore - aScore;
    })
    .slice(0, 3);

  const pageEntity = fullArticle && item.editorial ? {
    '@type': 'NewsArticle',
    '@id': `${pageUrl}#article`,
    headline: item.title,
    description: detailDescription(item.title, excerpt),
    url: pageUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    datePublished: item.publishedAt,
    dateModified: item.editorial.updatedAt,
    articleSection: item.topic,
    articleBody: item.editorial.body.join(' '),
    inLanguage: 'ar-EG',
    author: { '@type': 'Person', name: item.editorial.author },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
      logo: { '@type': 'ImageObject', url: `${siteConfig.url}/icon.svg` },
    },
    citation: item.url,
  } : {
    '@type': 'WebPage',
    '@id': `${pageUrl}#page`,
    name: item.title,
    description: detailDescription(item.title, heroSummary),
    url: pageUrl,
    datePublished: item.publishedAt,
    ...(generatedEditorial || sourceDigest ? {
      dateModified: generatedEditorial?.generatedAt || sourceDigest?.preparedAt,
    } : {}),
    inLanguage: 'ar-EG',
    isPartOf: { '@id': `${siteConfig.url}#website` },
    citation: item.url,
    ...(generatedEditorial ? {
      abstract: generatedEditorial.lead,
      text: generatedEditorial.body.join(' '),
    } : sourceDigest ? {
      abstract: sourceDigest.lead,
      text: [sourceDigest.lead, ...sourceDigest.excerpts].join(' '),
    } : {}),
    isBasedOn: {
      '@type': 'CreativeWork',
      name: item.title,
      url: item.url,
      publisher: { '@type': 'Organization', name: item.source, url: item.sourceUrl },
    },
  };

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      pageEntity,
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'أخبار العسيرات', item: `${siteConfig.url}/news` },
          { '@type': 'ListItem', position: 3, name: item.title, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className={styles.main}>
      <header className={styles.hero} data-topic={item.topic}>
        <div className={styles.heroPattern} aria-hidden="true" />
        <div className={`shell ${styles.heroShell}`}>
          <nav className="breadcrumbs breadcrumbs--dark" aria-label="مسار التنقل">
            <Link href="/">الرئيسية</Link><span>/</span>
            <Link href="/news">الأخبار</Link><span>/</span>
            <span>{item.topic}</span>
          </nav>

          <div className={styles.kicker}>
            <span>{item.topic}</span>
            <span aria-hidden="true">•</span>
            <span>{item.village}</span>
          </div>
          <h1>{item.title}</h1>
          <p>{heroSummary || 'تفاصيل هذه التغطية متاحة لدى المصدر الأصلي، وتعرض هذه الصفحة بيانات الخبر ومصدره الموثق.'}</p>
          <div className={styles.heroMeta}>
            <span className={styles.brand}><BrandMark compact /></span>
            <div><small>الناشر الأصلي</small><strong>{item.source}</strong></div>
            <time dateTime={item.publishedAt}>{dateFormatter.format(new Date(item.publishedAt))}</time>
          </div>
        </div>
      </header>

      <div className={`shell ${styles.layout}`}>
        <article className={styles.article}>
          {generatedEditorial ? (
            <div className={`${styles.disclosure} ${styles.editorialDisclosure}`} role="note">
              <span aria-hidden="true">✓</span>
              <div>
                <strong>تغطية تحريرية كاملة داخل دليل العسيرات</strong>
                <p>
                  صياغة أصلية مبنية على الوقائع المنشورة لدى {item.source}، مع ذكر المرجع بوضوح.
                  ليست نسخة من نص الناشر ولا تتضمن معلومات من خارج المادة المصدرية.
                </p>
              </div>
            </div>
          ) : sourceDigest ? (
            <div className={styles.disclosure} role="note">
              <span aria-hidden="true">✓</span>
              <div>
                <strong>موجز موسّع موثّق — من دون ذكاء اصطناعي</strong>
                <p>
                  جُلبت هذه التفاصيل مباشرة من صفحة {item.source}، ثم قُسمت إلى مقتطفات قصيرة
                  مع بقاء المقال الكامل وحقوقه لدى الناشر الأصلي.
                </p>
              </div>
            </div>
          ) : item.persisted && item.editorialStatus === 'source-only' ? (
            <div className={styles.disclosure} role="note">
              <span aria-hidden="true">✓</span>
              <div>
                <strong>خبر موثق دون تكلفة ذكاء اصطناعي</strong>
                <p>يعرض الدليل البيانات والموجز المتاحين من المصدر، مع رابط الناشر الأصلي، دون تشغيل نموذج مدفوع أو اختلاق صياغة.</p>
              </div>
            </div>
          ) : item.persisted && item.editorialStatus === 'pending' ? (
            <div className={styles.disclosure} role="status">
              <span aria-hidden="true">↻</span>
              <div>
                <strong>التغطية الكاملة قيد التجهيز في الخلفية</strong>
                <p>حُفظ الخبر ومصدره، وسيظهر النص الكامل تلقائيًا بعد انتهاء التوليد والتدقيق دون إبطاء هذه الصفحة.</p>
              </div>
            </div>
          ) : !fullArticle ? (
            <div className={styles.disclosure} role="note">
              <span aria-hidden="true">✓</span>
              <div>
                <strong>تعذر تجهيز التغطية الكاملة الآن</strong>
                <p>يعرض الدليل الوقائع المتاحة فقط دون اختلاق تفاصيل، ويعيد المحاولة عند تحديث الصفحة أو المصدر.</p>
              </div>
            </div>
          ) : null}

          <section className={styles.story} aria-labelledby="news-story-title">
            <span className="eyebrow eyebrow--dark">
              {fullArticle ? 'تغطية دليل العسيرات' : generatedEditorial ? `تغطية أصلية استنادًا إلى ${item.source}` : `بحسب ${item.source}`}
            </span>
            <h2 id="news-story-title">
              {fullArticle || generatedEditorial ? 'التغطية الكاملة' : sourceDigest ? 'الموجز الموسّع من المصدر' : 'تفاصيل الخبر المتاحة'}
            </h2>
            {fullArticle && item.editorial ? (
              item.editorial.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)
            ) : generatedEditorial ? (
              <>
                <p className={styles.storyLead}>{generatedEditorial.lead}</p>
                {generatedEditorial.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              </>
            ) : sourceDigest ? (
              <>
                <p className={styles.storyLead}>{sourceDigest.lead}</p>
                {sourceDigest.excerpts.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              </>
            ) : excerpt ? (
              <p>{excerpt}</p>
            ) : (
              <p>لم يرسل المصدر وصفًا كافيًا عبر قناة الربط. نعرض العنوان والبيانات المؤكدة فقط، ويمكن قراءة التفاصيل الكاملة من صفحة الناشر.</p>
            )}
          </section>

          {generatedEditorial ? (
            <section className={styles.highlights} aria-labelledby="news-highlights-title">
              <div className={styles.sectionHeading}>
                <span className="eyebrow eyebrow--dark">مختصر قابل للمراجعة</span>
                <h2 id="news-highlights-title">أبرز الوقائع المثبتة</h2>
              </div>
              <ul>
                {generatedEditorial.verifiedFacts.map((fact, index) => <li key={index}>{fact}</li>)}
              </ul>
              {generatedEditorial.localContext && generatedEditorial.localContext.length >= 60 ? (
                <div className={styles.localContext}>
                  <strong>ماذا يعني الخبر للعسيرات؟</strong>
                  <p>{generatedEditorial.localContext}</p>
                </div>
              ) : null}
              {generatedEditorial.coverageLevel === 'limited' && generatedEditorial.limitations ? (
                <p className={styles.limitations}><strong>حدود المعلومات:</strong> {generatedEditorial.limitations}</p>
              ) : null}
            </section>
          ) : null}

          <section className={styles.facts} aria-labelledby="news-facts-title">
            <div className={styles.sectionHeading}>
              <span className="eyebrow eyebrow--dark">بطاقة الخبر</span>
              <h2 id="news-facts-title">البيانات الموثقة</h2>
            </div>
            <dl>
              <div><dt>المصدر</dt><dd>{item.source}</dd></div>
              <div><dt>تاريخ النشر</dt><dd><time dateTime={item.publishedAt}>{dateFormatter.format(new Date(item.publishedAt))}</time></dd></div>
              <div><dt>النطاق المحلي</dt><dd>{item.village}</dd></div>
              <div><dt>التصنيف</dt><dd>{item.topic}</dd></div>
            </dl>
          </section>

          <section className={styles.method} aria-labelledby="news-method-title">
            <span className="eyebrow eyebrow--dark">منهجية النشر</span>
            <h2 id="news-method-title">صلة مباشرة ومصدر ظاهر</h2>
            {generatedEditorial ? (
              <p>
                استخلص النظام الوقائع المتاحة من صفحة الناشر، ثم أنشأ صياغة تحريرية أصلية لا تنقل عباراته.
                تُرفض التغطية آليًا إذا أضافت أرقامًا غير موجودة في المصدر أو احتوت مقاطع مطابقة طويلة، وتظل صفحة الناشر المرجع النهائي.
              </p>
            ) : sourceDigest ? (
              <p>
                يجلب النظام وصف الخبر ونصه المتاحين لدى {item.source}، ويعرض مقتطفات محدودة منسوبة إليه دون تشغيل أي نموذج ذكاء اصطناعي.
                لا يضيف الدليل وقائع جديدة، وتظل صفحة الناشر المرجع النهائي والنص الكامل.
              </p>
            ) : (
              <p>
                التقط نظام الرصد هذا الخبر لأن عنوانه أو وصفه يتضمن مركز العسيرات أو إحدى قراه في سياق سوهاج.
                ثم راجع الرابط، وحدد القرية والتصنيف، واستبعد النتائج المكررة قبل عرضها.
              </p>
            )}
          </section>
        </article>

        <aside className={styles.sourcePanel} aria-label="مصدر الخبر الأصلي">
          <div className={styles.sourceBrand}><BrandMark /></div>
          <span className={styles.sourceLabel}>المصدر الأصلي والمرجع النهائي</span>
          <h2>{item.source}</h2>
          <p>
            يعرض الدليل موجزًا ومقتطفات محدودة منسوبة بوضوح إلى المصدر. قد يحدّث الناشر الوقائع أو يصححها لاحقًا؛ لذلك تبقى صفحته المرجع النهائي.
          </p>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="button button--light"
            data-news-source={item.source}
            data-news-topic={item.topic}
            data-news-village={item.village}
          >
            فتح الخبر لدى المصدر <span aria-hidden="true">↗</span>
          </a>
          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className={styles.sourceHome}>
            الموقع الرسمي لـ {item.source} <span aria-hidden="true">↗</span>
          </a>
          <div className={styles.updateNote}>
            <i aria-hidden="true" />
            <span>
              <strong>تحديث تلقائي</strong>
              تفحص المهمة الخلفية القنوات كل 30 دقيقة، وتحفظ التغطية مسبقًا في قاعدة البيانات ثم تجددها إذا تغيرت المادة المصدرية.
            </span>
          </div>
        </aside>
      </div>

      {related.length ? (
        <section className={styles.related}>
          <div className="shell">
            <div className="section-heading section-heading--editorial">
              <div><span className="eyebrow eyebrow--dark">تغطيات مرتبطة</span><h2>أخبار أخرى من العسيرات</h2></div>
              <Link href="/news" className="text-link">كل الأخبار</Link>
            </div>
            <div className={styles.relatedGrid}>
              {related.map((candidate) => <NewsCard key={candidate.id} item={candidate} compact />)}
            </div>
          </div>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
    </main>
  );
}
