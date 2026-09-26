'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import styles from './admin-discovery-insights.module.css';

type Daily = { date: string; newVisitors: number; visitors: number; views: number };
type Page = { path: string; views: number; visitors: number };
type Miss = { query: string; village: string; category: string; count: number; lastSeenAt: string };
type Insights = {
  generatedAt: string;
  dailySeries: Daily[];
  topPages: Page[];
  searchSummary: { total: number; missed: number };
  missedSearches: Miss[];
};

const format = (value: number) => Number(value || 0).toLocaleString('ar-EG');
const dayName = (value: string) => new Intl.DateTimeFormat('ar-EG', {
  day: 'numeric', month: 'short', weekday: 'short',
}).format(new Date(`${value}T12:00:00Z`));

export function AdminDiscoveryInsights() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/discovery', { credentials: 'same-origin', cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'تعذر تحميل المؤشرات.');
      setInsights(payload as Insights);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل المؤشرات.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const today = insights?.dailySeries.at(-1);
  const summary = insights?.searchSummary;
  const missRate = summary?.total ? Math.round(summary.missed * 100 / summary.total) : 0;

  return <section id="admin-discovery" className={styles.panel} aria-labelledby="admin-discovery-title">
    <div className={styles.head}>
      <div>
        <span>بيانات مباشرة من الدليل</span>
        <h2 id="admin-discovery-title">زيارات كل يوم وفرص تطوير العسيرات</h2>
        <p>الزائر متصفح فريد، والجديد أول زيارة مسجلة منه. تُحسب الأيام بتوقيت مصر.</p>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading}>تحديث المؤشرات</button>
    </div>
    {loading && !insights ? <p className={styles.state}>جاري قراءة بيانات الزيارة والبحث…</p> : null}
    {error ? <p role="alert" className={styles.state}>{error}</p> : null}
    {insights ? <>
      <div className={styles.metrics}>
        <article><span>زوار جدد اليوم</span><strong>{format(today?.newVisitors || 0)}</strong><small>أول زيارة مسجلة اليوم</small></article>
        <article><span>زوار اليوم</span><strong>{format(today?.visitors || 0)}</strong><small>متصفحات فريدة</small></article>
        <article><span>مشاهدات اليوم</span><strong>{format(today?.views || 0)}</strong><small>صفحات داخل الدليل</small></article>
        <article><span>بحث بلا نتيجة</span><strong>{format(summary?.missed || 0)}</strong><small>{format(summary?.total || 0)} بحثًا في ٣٠ يومًا · {format(missRate)}٪ بلا نتيجة</small></article>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3>الزيارات خلال آخر ٣٠ يومًا</h3>
          <div className={styles.tableScroll}>
            <table>
              <thead><tr><th scope="col">اليوم</th><th scope="col">الجدد</th><th scope="col">الزوار</th><th scope="col">الصفحات</th></tr></thead>
              <tbody>{[...insights.dailySeries].reverse().map((day) =>
                <tr key={day.date}><th scope="row">{dayName(day.date)}</th><td>{format(day.newVisitors)}</td><td>{format(day.visitors)}</td><td>{format(day.views)}</td></tr>
              )}</tbody>
            </table>
          </div>
        </div>
        <div className={styles.card}>
          <h3>الصفحات الأكثر مشاهدة</h3>
          {insights.topPages.length ? <ol className={styles.rows}>{insights.topPages.map((page) =>
            <li key={page.path}><Link href={page.path.startsWith('/') ? page.path : '/'}>{page.path === '/' ? 'الرئيسية' : page.path}</Link><small>{format(page.visitors)} زائر</small><b>{format(page.views)} مشاهدة</b></li>
          )}</ol> : <p className={styles.empty}>ستظهر الصفحات هنا بعد تسجيل أول زيارة.</p>}
          <h3>بحث بلا نتائج: فرص للتحقق</h3>
          {insights.missedSearches.length ? <ol className={styles.rows}>{insights.missedSearches.map((item) =>
            <li key={`${item.query}-${item.village}-${item.category}`}>
              <strong>{item.query}</strong><small>{item.village !== 'all' ? item.village : 'كل القرى'} · {item.category !== 'all' ? item.category : 'كل الأقسام'}</small>
              <b>{format(item.count)} مرة</b>
            </li>
          )}</ol> : <p className={styles.empty}>لا توجد عبارات متكررة بلا نتيجة في الفترة المعروضة.</p>}
          <p className={styles.next}>راجع الطلب وتحقق من النشاط قبل إضافة أي سجل. <Link href="#directory-intelligence">افتح خطة التغطية ←</Link></p>
        </div>
      </div>
      <p className={styles.note}>مشاهدات الصفحات تبدأ من تفعيل هذا التحديث؛ لا تتوفر زيارات تاريخية منه قبل إصلاح تسجيل الصفحات. بيانات البحث السابقة متاحة بحسب ما سجّله الدليل، وقد تختلف عن Google Analytics.</p>
    </> : null}
  </section>;
}
