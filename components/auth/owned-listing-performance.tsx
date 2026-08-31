'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './owned-listing-performance.module.css';

type Item = {
  listingId: string;
  title: string;
  slug: string;
  village: string;
  category: string;
  views7d: number;
  views30d: number;
  phone30d: number;
  whatsapp30d: number;
  maps30d: number;
  favorites30d: number;
  interactions30d: number;
  conversionRate30d: number;
};

function n(value: number | undefined) {
  return Number(value || 0).toLocaleString('ar-EG');
}

function p(value: number | undefined) {
  return `${((value || 0) * 100).toLocaleString('ar-EG', { maximumFractionDigits: 1 })}%`;
}

export function OwnedListingPerformance() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/my-business-performance', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'تعذر تحميل أداء الأنشطة.');
        if (active) setItems(payload.items || []);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'تعذر تحميل أداء الأنشطة.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <section className={styles.panel} aria-labelledby="owned-performance-title">
      <div className={styles.head}>
        <div>
          <span>إحصاءات النشاط</span>
          <h2 id="owned-performance-title">أداء أنشطتي</h2>
          <p>المشاهدات والتفاعلات الفعلية المسجلة داخل دليل العسيرات. تبدأ الأرقام من تاريخ تفعيل طبقة القياس الجديدة.</p>
        </div>
      </div>

      {loading ? <div className={styles.empty}>جارٍ تحميل الأداء…</div> : error ? <div className={styles.error}>{error}</div> : items.length ? (
        <div className={styles.items}>
          {items.map((item) => (
            <article className={styles.item} key={item.listingId}>
              <div className={styles.itemHead}>
                <div><h3>{item.title}</h3><p>{item.category} · {item.village}</p></div>
                {item.slug && <Link href={`/listing/${item.slug}`}>عرض النشاط</Link>}
              </div>
              <div className={styles.metrics}>
                <div className={styles.metric}><span>مشاهدات 7 أيام</span><strong>{n(item.views7d)}</strong></div>
                <div className={styles.metric}><span>مشاهدات 30 يومًا</span><strong>{n(item.views30d)}</strong></div>
                <div className={styles.metric}><span>اتصال</span><strong>{n(item.phone30d)}</strong></div>
                <div className={styles.metric}><span>واتساب</span><strong>{n(item.whatsapp30d)}</strong></div>
                <div className={styles.metric}><span>خرائط</span><strong>{n(item.maps30d)}</strong></div>
                <div className={styles.metric}><span>إضافة للمفضلة</span><strong>{n(item.favorites30d)}</strong></div>
              </div>
              <div className={styles.rate}><span>إجمالي التفاعلات خلال 30 يومًا: <b>{n(item.interactions30d)}</b></span><span>معدل التفاعل مقابل المشاهدات: <b>{p(item.conversionRate30d)}</b></span></div>
            </article>
          ))}
        </div>
      ) : <div className={styles.empty}>لا توجد ملكيات أنشطة معتمدة في هذا الحساب، أو لم تبدأ بيانات الأداء بعد.</div>}
    </section>
  );
}
