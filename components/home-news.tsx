import Link from 'next/link';
import { NewsCard } from './news-card';
import { getLocalNews, selectHomepageNews } from '@/lib/news';
import styles from '@/app/home-news.module.css';

// Stream the feed independently: external publishers must not delay search or the hero.
export async function HomeNews() {
  const feed = await getLocalNews();
  const selected = selectHomepageNews(feed.items, 4);
  return (
    <section id="latest-news" className={`section ${styles.section}`}>
      <div className="shell">
        <div className={styles.masthead}>
          <div><span>من صفحات المصادر… إلى أهل البلد</span><h2>جريدة <em>البلد.</em></h2></div>
          <Link prefetch={false} href="/news">افتح صفحة الأخبار <b aria-hidden="true">←</b></Link>
        </div>
        <div className={styles.statusLine}><p>أخبار العسيرات وقراها، وكل خبر مع مصدره وتاريخ نشره.</p><span>فحص المصادر كل ٣٠ دقيقة · {feed.connectedSourceCount.toLocaleString('ar-EG')} قنوات استجابت</span></div>
        {selected.length ? (
          <div className={styles.grid}>{selected.map((item, index) => <NewsCard key={item.id} item={item} compact={index > 0} featured={index === 0} />)}</div>
        ) : (
          <div className={styles.empty}><strong>أخبار البلد أول ما تتوفر.</strong><p>تقدر تتصفح المصادر وطريقة جمع الأخبار في صفحة المرصد.</p><Link prefetch={false} href="/news">افتح مرصد الأخبار ←</Link></div>
        )}
        <Link prefetch={false} href="/news" className={styles.mobileLink}>عرض كل الأخبار</Link>
      </div>
    </section>
  );
}
