'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './admin-directory-intelligence.module.css';

type TermRow = { term: string; count: number; zeroResults?: number; village?: string; category?: string };
type RankedRow = { name: string; label?: string; count: number };
type GapRow = {
  term: string;
  village: string;
  category: string;
  searches7d: number;
  searches30d: number;
  zeroResults7d: number;
  zeroResults30d: number;
  uniqueSessions30d: number;
  firstSeenAt: string;
  lastSeenAt: string;
  targetVillage: string;
  targetCategory: string;
  categoryLabel: string;
  currentResultCount: number;
  scopeListingCount: number;
  zeroRate30d: number;
  priority: number;
  priorityLabel: 'عاجلة' | 'مرتفعة' | 'متوسطة' | 'مراقبة';
  recommendedAction: string;
};
type CollectionPlanRow = {
  key: string;
  village: string;
  category: string;
  categoryLabel: string;
  terms: string[];
  zeroDemand30d: number;
  uniqueDemand30d: number;
  gapCount: number;
  coverageCount: number;
  priority: number;
};
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
  gapQueue: GapRow[];
  resolvedGaps: GapRow[];
  collectionPlan: CollectionPlanRow[];
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
          <span>ذكاء البحث وأداء الأنشطة</span>
          <h2 id="directory-intelligence-title">ماذا يبحث عنه أهل العسيرات؟ وما الأنشطة التي تحقق تفاعلًا؟</h2>
          <p>طبقة قياس مباشرة داخل الدليل تربط البحث بالنتائج وفتح الأنشطة، وتعرض أداء كل نشاط دون الاعتماد على الأبعاد المخصصة في GA4.</p>
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

      <section className={styles.demandOps} aria-labelledby="demand-ops-title">
        <div className={styles.demandHead}>
          <div>
            <span>Discovery VNext.1</span>
            <h3 id="demand-ops-title">خطة جمع البيانات من الطلب الحقيقي</h3>
            <p>كل استعلام صفري يُعاد اختباره الآن مقابل الدليل الحالي. ما زال صفرًا يدخل قائمة الجمع، وما أصبح له نتائج ينتقل تلقائيًا إلى «تم الحل» بدل إهدار وقت المسح.</p>
          </div>
          <div className={styles.demandSummary}>
            <span><b>{n(data.gapQueue?.length)}</b><small>فجوات نشطة</small></span>
            <span><b>{n(data.collectionPlan?.length)}</b><small>دفعات جمع</small></span>
            <span><b>{n(data.resolvedGaps?.length)}</b><small>فجوات حُلّت</small></span>
          </div>
        </div>

        {data.collectionPlan?.length ? (
          <div className={styles.planGrid}>
            {data.collectionPlan.map((item, index) => (
              <article className={styles.planCard} key={item.key}>
                <div className={styles.planRank}>{String(index + 1).padStart(2, '0')}</div>
                <div className={styles.planMain}>
                  <span>{item.village} · {item.categoryLabel}</span>
                  <h4>{item.terms.join(' · ')}</h4>
                  <p>{n(item.zeroDemand30d)} طلب صفري خلال 30 يومًا · {n(item.uniqueDemand30d)} جلسات طلب · التغطية الحالية {n(item.coverageCount)} سجل</p>
                </div>
                <div className={styles.planScore}><b>{n(item.priority)}</b><small>أولوية</small></div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>لا توجد دفعات جمع نشطة الآن؛ الاستعلامات الصفرية التاريخية إما حُلّت أو لا تكفي لتكوين أولوية تشغيلية.</div>
        )}

        <div className={styles.gapColumns}>
          <section className={styles.gapCard}>
            <div className={styles.sectionTitle}><span>Queue تشغيلية</span><h3>الفجوات التي ما زالت بلا نتائج</h3></div>
            {data.gapQueue?.length ? (
              <div className={styles.gapList}>
                {data.gapQueue.slice(0, 12).map((item) => (
                  <article className={styles.gapRow} key={`${item.term}-${item.village}-${item.category}`}>
                    <div className={styles.gapIdentity}>
                      <strong>{item.term}</strong>
                      <span>{item.targetVillage || 'كل العسيرات'} · {item.categoryLabel || 'قسم غير محدد'}</span>
                      <small>{item.recommendedAction}</small>
                    </div>
                    <div className={styles.gapDemand}>
                      <b>{n(item.zeroResults30d)}</b><span>صفر / 30 يوم</span>
                      <small>{n(item.uniqueSessions30d)} جلسات مختلفة</small>
                    </div>
                    <div className={styles.gapPriority}>
                      <b>{n(item.priority)}</b>
                      <span>{item.priorityLabel}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className={styles.empty}>لا توجد فجوات بحث حقيقية غير محلولة حاليًا.</div>}
          </section>

          <section className={styles.gapCard}>
            <div className={styles.sectionTitle}><span>تنظيف تلقائي</span><h3>فجوات تاريخية أصبحت محلولة</h3></div>
            {data.resolvedGaps?.length ? (
              <div className={styles.resolvedList}>
                {data.resolvedGaps.slice(0, 10).map((item) => (
                  <div key={`resolved-${item.term}-${item.village}-${item.category}`}>
                    <div><strong>{item.term}</strong><small>{item.targetVillage || 'كل العسيرات'} · {item.categoryLabel || 'كل الأقسام'}</small></div>
                    <span><b>{n(item.currentResultCount)}</b> نتيجة الآن</span>
                  </div>
                ))}
              </div>
            ) : <div className={styles.empty}>لم تُرصد فجوات تاريخية محلولة في نافذة الـ30 يومًا.</div>}
          </section>
        </div>
      </section>

      <section className={styles.card} style={{ marginTop: 18 }}>
        <div className={styles.sectionTitle}><span>الأداء حسب النشاط</span><h3>أداء الأنشطة — آخر 30 يومًا</h3></div>
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
