import Link from 'next/link';
import type { LocalNewsItem, NewsTopic } from '@/lib/news';
import { newsItemPath } from '@/lib/news';
import styles from './news-card.module.css';

const topicIcons: Record<NewsTopic, React.ReactNode> = {
  'خدمات وتنمية': (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5h16M6 19.5V10l6-5 6 5v9.5M9.5 19.5v-5h5v5" /></svg>
  ),
  الصحة: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.2 4h5.6v5.2H20v5.6h-5.2V20H9.2v-5.2H4V9.2h5.2Z" /></svg>
  ),
  التعليم: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 9 8.5-4 8.5 4-8.5 4ZM6.5 11.2v4.6c3.7 2.5 7.3 2.5 11 0v-4.6M20.5 9v6" /></svg>
  ),
  المجتمع: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3" /><circle cx="16.5" cy="9" r="2.5" /><path d="M2.8 19c.4-3.7 2-5.6 5.2-5.6s4.8 1.9 5.2 5.6M13.2 14.2c1-.8 2.1-1.2 3.5-1.2 2.7 0 4 1.7 4.5 5" /></svg>
  ),
  'أخبار وحوادث': (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h14v15H5zM8 8h8M8 11.5h8M8 15h5" /></svg>
  ),
};

const dateFormatter = new Intl.DateTimeFormat('ar-EG', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'Africa/Cairo',
});

export function NewsCard({ item, compact = false }: { item: LocalNewsItem; compact?: boolean }) {
  const publishedDate = dateFormatter.format(new Date(item.publishedAt));

  return (
    <article className={`${styles.card}${compact ? ` ${styles.compact}` : ''}`}>
      <div className={styles.visual} data-topic={item.topic}>
        <span className={styles.icon}>{topicIcons[item.topic]}</span>
        <span className={styles.topic}>{item.topic}</span>
        <span className={styles.pattern} aria-hidden="true" />
      </div>

      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.source}><i aria-hidden="true" /> {item.source}</span>
          <time dateTime={item.publishedAt}>{publishedDate}</time>
        </div>

        <h3>
          <Link
            href={newsItemPath(item)}
            data-news-detail={item.id}
            data-news-topic={item.topic}
            data-news-village={item.village}
            aria-label={`${item.title} — تفاصيل الخبر داخل دليل العسيرات`}
          >
            {item.title}
          </Link>
        </h3>

        {item.summary ? <p>{item.summary}</p> : null}

        <div className={styles.footer}>
          <span className={styles.location}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></svg>
            {item.village}
          </span>
          <span className={styles.actions}>
            <Link
              className={styles.details}
              href={newsItemPath(item)}
              data-news-detail={item.id}
              data-news-topic={item.topic}
              data-news-village={item.village}
            >
              التفاصيل
            </Link>
            <a
              className={styles.read}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              data-news-source={item.source}
              data-news-topic={item.topic}
              data-news-village={item.village}
            >
              المصدر <b aria-hidden="true">↗</b>
            </a>
          </span>
        </div>
      </div>
    </article>
  );
}
