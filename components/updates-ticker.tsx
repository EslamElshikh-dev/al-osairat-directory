'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './updates-ticker.module.css';
import { loadPublicUpdates, type PublicUpdate } from '@/lib/public-updates-client';

type Update = PublicUpdate;

const labels: Record<Update['type'], string> = {
  news: 'خبر',
  job: 'وظيفة',
  article: 'مقال',
};

export function UpdatesTicker() {
  const [items, setItems] = useState<Update[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout>;

    async function load() {
      if (document.visibilityState !== 'visible') return;
      try {
        const updates = await loadPublicUpdates();
        if (!active) return;
        setItems(updates.filter((item) =>
          item && typeof item.id === 'string'
          && (item.type === 'job' || item.type === 'news' || item.type === 'article')
          && typeof item.title === 'string' && typeof item.href === 'string'
          && item.href.startsWith('/') && !item.href.startsWith('//')
        ).slice(0, 9));
      } catch {
        // Keep the navigation links available when updates cannot load.
      }
    }

    const start = () => { timeout = setTimeout(() => { void load(); }, 1200); };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(() => { void load(); }, 30 * 60 * 1000);
    return () => {
      active = false;
      window.removeEventListener('load', start);
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  return <section className={styles.root} data-paused={paused} data-empty={!items.length} dir="rtl" aria-label="آخر أخبار وفرص دليل العسيرات">
    <div className={styles.heading}><i aria-hidden="true" /><span><small>نبض العسيرات</small><strong>الجديد عندنا</strong></span></div>
    {items.length ? <>
      <div className={styles.viewport}>
        <div className={styles.track}>
          <div className={styles.group}>
            {items.map((item) => <Link prefetch={false} className={styles.item} href={item.href} key={item.id}>
              <span>{labels[item.type]}</span><strong>{item.title}</strong><b aria-hidden="true">←</b>
            </Link>)}
          </div>
          <div className={`${styles.group} ${styles.clone}`} aria-hidden="true">
            {items.map((item) => <span className={styles.item} key={`copy-${item.id}`}>
              <span>{labels[item.type]}</span><strong>{item.title}</strong><b aria-hidden="true">←</b>
            </span>)}
          </div>
        </div>
      </div>
      <button type="button" className={styles.control} aria-pressed={paused}
        aria-label={paused ? 'استئناف حركة الشريط' : 'إيقاف حركة الشريط'}
        onClick={() => setPaused((value) => !value)}>
        <span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span>
      </button>
    </> : <div className={styles.fallback}>
      <Link href="/news">أخبار العسيرات</Link><span aria-hidden="true">·</span><Link href="/jobs">فرص العمل في سوهاج</Link>
    </div>}
  </section>;
}
