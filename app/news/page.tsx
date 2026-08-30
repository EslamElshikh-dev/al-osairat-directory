import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark } from '@/components/site-shell';
import { NewsCard } from '@/components/news-card';
import { buildPageMetadata } from '@/lib/metadata';
import { getLocalNews, newsSourceCatalog, type NewsTopic } from '@/lib/news';
import { siteConfig } from '@/lib/site';
import styles from './news-page.module.css';

export const revalidate = 1800;

const title = 'أخبار العسيرات وقرى مركز العسيرات';
const description = 'مرصد آلي يجمع أحدث أخبار مركز العسيرات وقراه في سوهاج من مصادر صحفية ورسمية موثوقة، مع رابط مباشر إلى المصدر الأصلي.';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title,
    description,
    path: '/news',
    imageAlt: 'أخبار العسيرات وقراها من المصادر الموثوقة',
  }),
  keywords: [
    'أخبار العسيرات', 'اخبار العسيرات اليوم', 'أخبار قرى العسيرات', 'العسيرات سوهاج',
    'مركز العسيرات', 'أولاد حمزة', 'الرشايدة', 'النويرات', 'عوامر العسيرات',
  ],
};

const dateTimeFormatter = new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Africa/Cairo',
});

const topicOrder: NewsTopic[] = ['خدمات وتنمية', 'الصحة', 'التعليم', 'المجتمع', 'أخبار وحوادث'];

export default async function NewsPage() {
  const feed = await getLocalNews();
  const topicCounts = new Map<NewsTopic, number>();

  for (const item of feed.items) topicCounts.set(item.topic, (topicCounts.get(item.topic) || 0) + 1);

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${siteConfig.url}/news#page`,
        name: title,
        description,
        url: `${siteConfig.url}/news`,
        inLanguage: 'ar-EG',
        isPartOf: { '@id': `${siteConfig.url}#website` },
        about: {
          '@type': 'Place',
          name: 'مركز العسيرات، سوهاج، مصر',
        },
        mainEntity: { '@id': `${siteConfig.url}/news#items` },
      },
      {
        '@type': 'ItemList',
        '@id': `${siteConfig.url}/news#items`,
        numberOfItems: feed.items.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: feed.items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.title,
          url: item.url,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: siteConfig.url },
          { '@type': 'ListItem', position: 2, name: 'أخبار العسيرات', item: `${siteConfig.url}/news` },
        ],
      },
    ],
  };

  return (
    <main id="main-content" className={styles.main}>
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
              نلتقط التغطيات التي تذكر مركز العسيرات أو إحدى قراه، نزيل التكرار، ثم نعرض العنوان
              والمصدر والتاريخ فقط مع فتح الخبر الكامل لدى الناشر الأصلي.
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
              <div><strong>30</strong><span>دقيقة للتحديث</span></div>
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
            <h2>أحدث أخبار العسيرات</h2>
            <p>مرتبة من الأحدث إلى الأقدم، وكل بطاقة تنقلك مباشرة إلى المصدر الذي نشر الخبر.</p>
          </div>
          <span className={styles.refreshBadge}><i aria-hidden="true" /> تحديث تلقائي</span>
        </div>

        {feed.connectedSourceCount < feed.totalSourceCount ? (
          <div className={styles.sourceWarning} role="status">
            تعذر الوصول مؤقتًا إلى بعض القنوات؛ الأخبار الموثقة المتاحة ما زالت ظاهرة وسيُعاد الفحص تلقائيًا.
          </div>
        ) : null}

        <div className={styles.grid}>
          {feed.items.map((item) => <NewsCard key={item.id} item={item} />)}
        </div>
      </section>

      <section id="news-method" className={styles.methodSection}>
        <div className={`shell ${styles.methodGrid}`}>
          <div className={styles.methodCopy}>
            <span className="eyebrow eyebrow--dark">سياسة الرصد والنشر</span>
            <h2>تجميع مسؤول يحافظ على الدقة وحقوق المصدر.</h2>
            <p>
              لا ينسخ الدليل المقالات ولا ينشئ صفحات خبر بديلة. نعرض عنوانًا ومختصرًا محدودًا واسم الناشر
              وتاريخ النشر، بينما يبقى النص الكامل والصور والتحديثات لدى المصدر الأصلي.
            </p>
            <ol>
              <li><b>01</b><span><strong>فلترة محلية</strong> لا يمر الخبر إلا عند ذكر العسيرات أو قرية مرتبطة بها مع سياق سوهاج.</span></li>
              <li><b>02</b><span><strong>منع التكرار</strong> تُقارن الروابط والعناوين قبل ظهورها في القائمة.</span></li>
              <li><b>03</b><span><strong>مصدر واضح</strong> كل بطاقة تحمل اسم الناشر وتفتح صفحته الأصلية.</span></li>
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
        <p><strong>تنبيه:</strong> حقوق الأخبار والصور والنصوص محفوظة لناشريها. دليل العسيرات خدمة فهرسة وربط محلية ولا يدّعي ملكية المحتوى الخارجي.</p>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema).replace(/</g, '\\u003c') }}
      />
    </main>
  );
}
