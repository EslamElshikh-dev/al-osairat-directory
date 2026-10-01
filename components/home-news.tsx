import Link from 'next/link';
import { NewsCard } from './news-card';
import { getLocalNews, selectHomepageNews } from '@/lib/news';
import styles from '@/app/home-news.module.css';

// Stream the feed independently: external publishers must not delay search or the hero.
export async function HomeNews() {
  const feed = await getLocalNews();
  return (
    <section id="latest-news" className={`section ${styles.section}`}>
      <div className="shell">
        <div className="section-heading section-heading--editorial">
          <div><span className="eyebrow eyebrow--dark">نبض البلد</span><h2>الجديد في العسيرات</h2><p>أخبار بلدنا وقراها، وكل خبر مع مصدره.</p></div>
          <Link prefetch={false} href="/news" className="text-link">كل الأخبار</Link>
        </div>
        <div className={styles.statusLine}><span>تحديث المصادر كل 30 دقيقة</span><span>{feed.connectedSourceCount} قنوات متصلة</span></div>
        <div className={styles.grid}>{selectHomepageNews(feed.items, 4).map((item) => <NewsCard key={item.id} item={item} compact />)}</div>
        <Link prefetch={false} href="/news" className={styles.mobileLink}>عرض كل الأخبار</Link>
      </div>
    </section>
  );
}
