'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './admin-directory-intelligence.module.css';

type TermRow = { term: string; count: number; zeroResults?: number; village?: string; category?: string };
type RankedRow = { name: string; label?: string; count: number };
type ListingRow = {
  listingId: string;
  slug: string;
  title: string;
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

type Payload = {
  search: { total7d: number; total30d: number; zero7d: number; converted7d: number };
  topTerms: TermRow[];
  zeroResultTerms: TermRow[];
  topSearchVillages: RankedRow[];
  topSearchCategories: RankedRow[];
  topListings: ListingRow[];
  generatedAt: string;
};

function n(value: number | undefined) {
  return Number(value || 0).toLocaleString('ar-EG');
}

function p(value: number | undefined) {
  return `${((value || 0) * 100).toLocaleString('ar-EG', { maximumFractionDigits: 1 })}%`;
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <article className={styles.metric}><span>{label}</span><strong>{value}</strong><small>{hint}</small></article>;
}

function RankedList({ title, eyebrow, rows, opportunity = false }: { title: string; eyebrow: string; rows: Array<{ label: string; count: number; note?: string }>; opportunity?: boolean }) {
  return (
    <section className={`${styles.card}${opportunity ? ` ${styles.opportunity}` : ''}`}>
      <div className={styles.sectionTitle}><span>{eyebrow}</span><h3>{title}</h3></div>
      {rows.length ? <div className={styles.list}>{rows.map((row, index) => (
        <div className={styles.row} key={`${title}-${row.label}-${index}`}>
          <div><strong>{row.label}</strong>{row.note && <small>{row.note}</small>}</div><b>{n(row.count)}</b>
        </div>
      ))}</div> : <div className={styles.empty}>لا توجد بيانات كافية بعد.</div>}
    </section>
  );
}

export function AdminDirectoryIntelligence() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/directory-intelligence', { cache: 'no-store', credentials: 'same-origin' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'تعذر تحميل ذكاء البحث.');
      setData(payload as Payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل ذكاء البحث.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const searchConversion = useMemo(() => {
    if (!data?.search.total7d) return 0;
    return data.search.converted7d / data.search.total7d;
  }, [data]);

  if (loading && !data) return <section id="directory-intelligence" className={styles.panel}><div className={styles.empty}>جاري تجميع ذكاء البحث وأداء الأنشطة…</div></section>;
  if (error && !data) return <section id="directory-intelligence" className={styles.panel}><div className={styles.error}>{error}</div></section>;
  if (!data) return null;

  return (
    <section id="directory-intelligence" className={styles.panel} aria-labelledby="directory-intelligence-title">
      <div className={styles.head}>
        <div>
          <span>Search Intelligence + Listing Performance</span>
          <h2 id="directory-intelligence-title">ماذا يبحث عنه أهل العسيرات؟ وما الأنشطة التي تحقق تفاعلًا؟</h2>
          <p>طبقة قياس First‑Party داخل الدليل تربط البحث بالنتائج وفتح الأنشطة، وتعرض أداء كل نشاط بدون الاعتماد على Custom Dimensions في GA4.</p>
        </div>
        <button className={styles.refresh} type="button" onClick={() => void load()} disabled={loading}>{loading ? 'تحديث…' : 'تحديث البيانات'}</button>
      </div>

      <div className={styles.metrics}>
        <Metric label="عمليات البحث — 7 أيام" value={n(data.search.total7d)} hint={`${n(data.search.total30d)} خلال 30 يومًا`} />
        <Metric label="بحث بدون نتائج — 7 أيام" value={n(data.search.zero7d)} hint="فجوات محتوى أو بيانات محتملة" />
        <Metric label="بحث أدى لفتح نشاط" value={p(searchConversion)} hint={`${n(data.search.converted7d)} عملية بحث تحولت لزيارة نشاط`} />
        <Metric label="أنشطة لها بيانات أداء" value={n(data.topListings.length)} hint="أعلى 30 نشاطًا خلال 30 يومًا" />
      </div>

      <div className={styles.grid}>
        <RankedList eyebrow="الكلمات الأكثر طلبًا" title="أعلى كلمات البحث" rows={(data.topTerms || []).map((item) => ({ label: item.term, count: item.count, note: item.zeroResults ? `${n(item.zeroResults)} بدون نتيجة` : undefined }))} />
        <RankedList opportunity eyebrow="فرص مباشرة" title="بحث متكرر بدون نتائج" rows={(data.zeroResultTerms || []).map((item) => ({ label: item.term, count: item.count, note: [item.village && item.village !== 'all' ? item.village : '', item.category && item.category !== 'all' ? item.category : ''].filter(Boolean).join(' · ') || 'كل الدليل' }))} />
        <RankedList eyebrow="طلب البحث" title="أعلى القرى في البحث" rows={(data.topSearchVillages || []).map((item) => ({ label: item.name, count: item.count }))} />
        <RankedList eyebrow="طلب البحث" title="أعلى الأقسام في البحث" rows={(data.topSearchCategories || []).map((item) => ({ label: item.label || item.name, count: item.count }))} />
      </div>

      <section className={styles.card} style={{ marginTop: 18 }}>
        <div className={styles.sectionTitle}><span>Performance لكل نشاط</span><h3>أداء الأنشطة — آخر 30 يومًا</h3></div>
        {data.topListings?.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>النشاط</th><th>7 أيام</th><th>30 يومًا</th><th>اتصال</th><th>واتساب</th><th>خرائط</th><th>مفضلة</th><th>معدل التفاعل</th></tr></thead>
              <tbody>{data.topListings.map((item) => (
                <tr key={item.listingId}>
                  <td><strong>{item.title}</strong><br /><small>{item.category} · {item.village}</small></td>
                  <td>{n(item.views7d)}</td><td>{n(item.views30d)}</td><td>{n(item.phone30d)}</td><td>{n(item.whatsapp30d)}</td><td>{n(item.maps30d)}</td><td>{n(item.favorites30d)}</td>
                  <td className={item.conversionRate30d > 0 ? styles.positive : undefined}>{p(item.conversionRate30d)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className={styles.empty}>ستبدأ بيانات أداء الأنشطة في الظهور مع الزيارات والتفاعلات الجديدة بعد نشر هذه المرحلة.</div>}
      </section>

      <div className={styles.note}>لا يتم تخزين بريد أو هاتف أو هوية شخصية في طبقة القياس. أي بحث يبدو أنه يحتوي على بريد إلكتروني أو رقم طويل يتم إسقاط نصه قبل التخزين، وتظل البيانات تشغيلية لتحسين الدليل وليست سجل تدقيق مالي.</div>
    </section>
  );
}
