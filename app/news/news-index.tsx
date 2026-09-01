import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BrandMark } from '@/components/site-shell';
import { NewsCard } from '@/components/news-card';
import { NewsRefreshPulse } from '@/components/news-refresh-pulse';
import { getLocalNews, newsSourceCatalog, type NewsTopic } from '@/lib/news';
import { NEWS_PAGE_SIZE, newsPageHref, paginateNews } from '@/lib/news-pagination';
import { siteConfig } from '@/lib/site';
import styles from './news-page.module.css';

export const NEWS_TITLE = 'أخبار العسيرات وقرى مركز العسيرات';
export const NEWS_DESCRIPTION = 'مرصد آلي يجمع أحدث أخبار مركز العسيرات وقراه في سوهاج من مصادر صحفية ورسمية موثوقة، مع رابط مباشر إلى المصدر الأصلي.';
export const NEWS_KEYWORDS = [
  'أخبار العسيرات', 'اخبار العسيرات اليوم', 'أخبار قرى العسيرات', 'العسيرات سوهاج',
  'مركز العسيرات', 'أولاد حمزة', 'الرشايدة', 'النويرات', 'عوامر العسيرات',
];

const dateTimeFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Africa/Cairo',
});

const topicOrder: NewsTopic[] = ['خدمات وتنمية', 'الصحة', 'التعليم', 'المجتمع', 'أخبار وحوادث'];

export async function NewsIndex({ page = 1 }: { page?: number }) {
  const feed = await getLocalNews();
  const topicCounts = new Map<NewsTopic, number>();

  for (const item of feed.items) topicCounts.set(item.topic, (topicCounts.get(item.topic) || 0) + 1);

  let pagination;
  try {
    pagination = paginateNews(feed.items, page);
  } catch {
    notFound();
  }

  const canonicalPath = pagination.currentPage === 1
    ? '/news'
    : `/news/page/${pagination.currentPage}`;
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${siteConfig.url}${canonicalPath}#page`,
        name: pagination.currentPage === 1 ? NEWS_TITLE : `${NEWS_TITLE} - الصفحة ${pagination.currentPage}`,
        description: NEWS_DESCRIPTION,
        url: `${siteConfig.url}${canonicalPath}`,
        inLanguage: 'ar-EG',
        isPartOf: { '@id': `${siteConfig.url}#website` },
        about: {
          '@type': 'Place',
          name: 'مركز العسيرات، سوهاج، مصر',
        },
        mainEntity: { '@id': `${siteConfig.url}${canonicalPath}#items` },
      },
      {
        '@type': 'ItemList',
        '@id': `${siteConfig.url}${canonicalPath}#items`,
        numberOfItems: pagination.pageItems.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: pagination.pageItems.map((item, index) => ({
          '@type': 'ListItem',
          position: (pagination.currentPage - 1) * NEWS_PAGE_SIZE + index + 1,
          name: item.title,
          url: item.url,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'أخبار العسيرات', item: `${siteConfig.url}/news` },
          ...(pagination.currentPage > 1 ? [{
            '@type': 'ListItem',
            position: 3,
            name: `الصفحة ${pagination.currentPage}`,
            item: `${siteConfig.url}${canonicalPath}`,
          }] : []),
        ],
      },
    ],
  };

  return (
    <main id="main-content" className={styles.main}>
      <NewsRefreshPulse />
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={`shell ${styles.heroGrid}`}>
          <div className={styles.heroContent}>
            <nav className="breadcrumbs breadcrumbs--dark" aria-label="مسار التنقل">
              <Link href="/">الرئيسية</Link><span>/</span><span>الأخبار</span>
            </nav>
            <span className={styles.liveLabel}><i aria-hidden="true" /> رصد آلي من مصادر موثوقة</span>
            <h1>أخبار <em>العسيرات وقراها</em> في مكان واحد.</h1>
            <p>
              نلتقط التغطيات التي تذكر مركز العسيرات أو إحدى قراه، نزيل التكرار، ثم نعرض داخل الدليل
              موجز الخبر وبياناته الموثقة، مع إظهار الناشر والرابط الأصلي بوضوح ودون تكلفة ذكاء اصطناعي.
            </p>
            <div className={styles.heroActions}>
              <a href="#latest-news" className="button button--light">شاهد أحدث الأخبار</a>
              <a href="#news-method" className="button button--outline-light">كيف نختار الخبر؟</a>
            </div>
          </div>

          <aside className={styles.monitor} aria-label="حالة مرصد أخبار العسيرات">
            <div className={styles.monitorBrand}><BrandMark /></div>
            <div className={styles.monitorHead}>
              <div><span>حالة المرصد</span><strong>يعمل تلقائيًا</strong></div>
              <span className={styles.monitorStatus}><i aria-hidden="true" /> مباشر</span>
            </div>
            <div className={styles.monitorMetrics}>
              <div><strong>{feed.items.length}</strong><span>تغطية متاحة</span></div>
              <div><strong>{feed.connectedSourceCount}/{feed.totalSourceCount}</strong><span>قنوات متصلة</span></div>
              <div><strong>30</strong><span>دقيقة بين التحديثات التلقائية</span></div>
            </div>
            <p>آخر فحص: <time dateTime={feed.checkedAt}>{dateTimeFormatter.format(new Date(feed.checkedAt))}</time></p>
          </aside>
        </div>
      </section>

      <section className={`shell ${styles.topicStrip}`} aria-label="تصنيفات الأخبار المتاحة">
        <div><span>التغطية الحالية</span><strong>{feed.items.length} خبرًا وتغطية</strong></div>
        <div className={styles.topicList}>
          {topicOrder.flatMap((topic) => {
            const count = topicCounts.get(topic) || 0;
            return count ? [<span key={topic}>{topic}<b>{count}</b></span>] : [];
          })}
        </div>
      </section>

      <section id="latest-news" className={`section shell ${styles.latest}`}>
        <div className="section-heading section-heading--editorial">
          <div>
            <span className="eyebrow eyebrow--dark">آخر ما نُشر عن المركز</span>
            <h2>أحدث أخبار العسيرات{pagination.currentPage > 1 ? ` — الصفحة ${pagination.currentPage}` : ''}</h2>
            <p>مرتبة من الأحدث إلى الأقدم؛ افتح تفاصيل الخبر داخل الدليل أو انتقل مباشرة إلى الناشر الأصلي.</p>
          </div>
          <span className={styles.refreshBadge}><i aria-hidden="true" /> تحديث تلقائي</span>
        </div>

        {feed.connectedSourceCount < feed.totalSourceCount ? (
          <div className={styles.sourceWarning} role="status">
            تعذر الوصول مؤقتًا إلى بعض القنوات؛ الأخبار الموثقة المتاحة ما زالت ظاهرة وسيُعاد الفحص تلقائيًا.
          </div>
        ) : null}

        <p className={styles.pageSummary} aria-live="polite">
          عرض الأخبار من {pagination.startItem} إلى {pagination.endItem} من إجمالي {pagination.totalItems}
        </p>

        <div className={styles.grid}>
          {pagination.pageItems.map((item) => <NewsCard key={item.id} item={item} />)}
        </div>

        {pagination.totalPages > 1 ? (
          <nav className={styles.pagination} aria-label="صفحات أخبار العسيرات">
            {pagination.currentPage > 1 ? (
              <Link className={styles.pageDirection} href={newsPageHref(pagination.currentPage - 1)}>السابق</Link>
            ) : <span className={styles.pageDirectionDisabled} aria-disabled="true">السابق</span>}
            <div className={styles.pageNumbers}>
              {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((pageNumber) => (
                pageNumber === pagination.currentPage ? (
                  <span key={pageNumber} className={styles.pageCurrent} aria-current="page">{pageNumber}</span>
                ) : (
                  <Link key={pageNumber} className={styles.pageNumber} href={newsPageHref(pageNumber)} aria-label={`الصفحة ${pageNumber}`}>
                    {pageNumber}
                  </Link>
                )
              ))}
            </div>
            {pagination.currentPage < pagination.totalPages ? (
              <Link className={styles.pageDirection} href={newsPageHref(pagination.currentPage + 1)}>التالي</Link>
            ) : <span className={styles.pageDirectionDisabled} aria-disabled="true">التالي</span>}
          </nav>
        ) : null}
      </section>

      <section id="news-method" className={styles.methodSection}>
        <div className={`shell ${styles.methodGrid}`}>
          <div className={styles.methodCopy}>
            <span className="eyebrow eyebrow--dark">سياسة الرصد والنشر</span>
            <h2>تجميع مسؤول يحافظ على الدقة وحقوق المصدر.</h2>
            <p>
              يعرض الدليل الموجز والبيانات المتاحة من القنوات الرسمية دون نسخ المقال أو صوره أو تشغيل نموذج مدفوع.
              أما النص الكامل فيظل مقتصرًا على المواد الأصلية أو التي يملك الدليل إذنًا واضحًا بإعادة نشرها.
            </p>
            <ol>
              <li><b>01</b><span><strong>تصفية محلية</strong> لا يمر الخبر إلا عند ذكر العسيرات أو قرية مرتبطة بها في سياق يخص سوهاج.</span></li>
              <li><b>02</b><span><strong>منع التكرار</strong> تُقارن الروابط والعناوين قبل ظهورها في القائمة.</span></li>
              <li><b>03</b><span><strong>إسناد موثق</strong> لا تُضاف معلومة من خارج المادة، ويظل الناشر الأصلي ظاهرًا ومرجعه متاحًا.</span></li>
            </ol>
          </div>

          <aside className={styles.sources} aria-labelledby="news-sources-title">
            <div className={styles.sourcesHead}>
              <span>قائمة المصادر</span>
              <h2 id="news-sources-title">المصادر المتصلة حاليًا</h2>
            </div>
            <div className={styles.sourceList}>
              {newsSourceCatalog.map((source) => (
                <a key={source.name} href={source.url} target="_blank" rel="noopener noreferrer">
                  <span><i aria-hidden="true" />{source.name}<small>{source.type}</small></span>
                  <b aria-hidden="true">↗</b>
                </a>
              ))}
            </div>
            <p>إضافة أي مصدر جديد تخضع لمراجعة الموثوقية، وإمكانية الاستخدام، واستقرار التحديث.</p>
          </aside>
        </div>
      </section>

      <section className={`shell ${styles.notice}`} aria-label="تنبيه حقوق الأخبار">
        <span aria-hidden="true">i</span>
        <p><strong>تنبيه:</strong> حقوق الأخبار والصور والنصوص الخارجية محفوظة لناشريها. تغطيات الدليل صياغات مستقلة مبنية على الوقائع وليست نسخًا من المقالات الأصلية.</p>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema).replace(/</g, '\\u003c') }}
      />
    </main>
  );
}
