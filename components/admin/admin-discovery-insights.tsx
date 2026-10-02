'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import styles from './admin-discovery-insights.module.css';

type Daily = { date: string; measured: boolean; partial: boolean; newVisitors: number; visitors: number; views: number; sessions: number; navigators: number };
type Insights = {
  generatedAt: string; measurementStartedAt: string; lastPageViewAt: string | null;
  dailySeries: Daily[];
  topPages: { path: string; views: number; visitors: number }[];
  searchSummary: { total: number; missed: number };
  missedSearches: { query: string; village: string; category: string; count: number; lastSeenAt: string }[];
};
const n = (value = 0) => value.toLocaleString('ar-EG');
const dayName = (value: string) => new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', weekday: 'short', timeZone: 'Africa/Cairo' }).format(new Date(`${value}T12:00:00Z`));
const dateTime = (value: string) => new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Cairo' }).format(new Date(value));
const pageNames: Record<string,string> = { '/': 'الرئيسية', '/directory': 'دليل الأنشطة', '/news': 'الأخبار', '/jobs': 'الوظائف', '/villages': 'القرى', '/account': 'حساب العضو', '/community': 'المجتمع', '/developer': 'عن المطوّر' };
const safePath = (path: string) => path.startsWith('/') && !path.startsWith('//') && !path.includes('\\');
function pageName(path: string) { try { return pageNames[path.replace(/\/$/,'')] || pageNames[path] || decodeURI(path); } catch { return path; } }

export function AdminDiscoveryInsights() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<7 | 30>(7);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/discovery', { credentials: 'same-origin', cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'تعذر تحميل المؤشرات.');
      setInsights(payload); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تحميل المؤشرات.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);
  const today = insights?.dailySeries.at(-1);
  const series = insights?.dailySeries.slice(-days) || [];
  const max = Math.max(1, ...series.map(day => day.visitors));
  return <section id="admin-discovery" className={styles.panel} aria-labelledby="admin-discovery-title" aria-busy={loading}>
    <header className={styles.head}>
      <div><span>نبض الدليل · بتوقيت مصر</span><h2 id="admin-discovery-title">كام زائر دخل؟ وكام زائر كمل يتصفّح؟</h2><p>زوار فريدون، وتنقّل بين الصفحات، وأماكن تستحق اهتمامك.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading}>{loading ? 'جارٍ التحديث…' : 'تحديث الآن'}</button>
    </header>
    {error ? <p className={styles.state} role="alert">{error} {insights ? 'الأرقام المعروضة من آخر تحديث ناجح.' : ''}</p> : null}
    {!insights && loading ? <p className={styles.state}>جاري قراءة الزيارات المسجّلة…</p> : null}
    {insights ? <>
      <div className={styles.metrics}>
        <article><span>زوار اليوم</span><strong>{n(today?.visitors)}</strong><small>كل متصفح مرة واحدة في اليوم</small></article>
        <article><span>تنقّلوا داخل الدليل</span><strong>{n(today?.navigators)}</strong><small>فتحوا صفحتين مختلفتين أو أكثر اليوم</small></article>
        <article><span>مشاهدات الصفحات اليوم</span><strong>{n(today?.views)}</strong><small>يشمل العودة لصفحة سبق فتحها</small></article>
        <article><span>زوار جدد اليوم</span><strong>{n(today?.newVisitors)}</strong><small>أول ظهور منذ بدء القياس الصحيح</small></article>
      </div>
      <div className={styles.health}>
        <strong>{insights.lastPageViewAt ? 'يستقبل الدليل زيارات مسجّلة' : 'بانتظار أول زيارة مسجّلة'}</strong>
        <span>بدء القياس الصحيح: {dateTime(insights.measurementStartedAt)}</span>
        <span>تحديث اللوحة: {dateTime(insights.generatedAt)}</span>
      </div>
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.chartHead}><h3>الزيارات يومًا بيوم</h3><div className={styles.switch} aria-label="فترة العرض">{([7,30] as const).map(value => <button type="button" key={value} aria-pressed={days===value} onClick={()=>setDays(value)}>{value===7?'٧ أيام':'٣٠ يومًا'}</button>)}</div></div>
          <div className={styles.bars} aria-hidden="true">{series.map(day => <div key={day.date} title={`${dayName(day.date)}: ${day.measured ? n(day.visitors) : 'غير مقاس'}`}><span style={{height: `${day.measured ? day.visitors / max * 100 : 0}%`}} /><small>{Number(day.date.slice(-2)).toLocaleString('ar-EG')}</small></div>)}</div>
          <div className={styles.tableScroll}><table>
            <caption className={styles.caption}>اليوم الحالي ويوم بدء القياس بياناتهما غير مكتملة. «—» تعني أن القياس لم يكن يعمل.</caption>
            <thead><tr><th scope="col">اليوم</th><th scope="col">الزوار</th><th scope="col">تنقّلوا</th><th scope="col">الصفحات</th><th scope="col">الجدد</th></tr></thead>
            <tbody>{[...series].reverse().map(day => <tr key={day.date}><th scope="row">{dayName(day.date)}{day.measured && day.partial ? <small className={styles.partial}>غير مكتمل</small> : null}</th>{[day.visitors,day.navigators,day.views,day.newVisitors].map((value,index)=><td key={index}>{day.measured ? n(value) : '—'}</td>)}</tr>)}</tbody>
          </table></div>
        </div>
        <div className={styles.card}>
          <h3>الصفحات الأكثر مشاهدة <small>آخر ٣٠ يومًا</small></h3>
          {insights.topPages.length ? <ol className={styles.rows}>{insights.topPages.map(page=><li key={page.path}><Link prefetch={false} href={safePath(page.path)?page.path:'/'}>{pageName(page.path)}</Link><small>{n(page.visitors)} زائر</small><b>{n(page.views)} مشاهدة</b></li>)}</ol> : <p className={styles.empty}>ستظهر الصفحات بعد أول زيارة حقيقية للدليل.</p>}
          <h3>ناس بتدوّر… ومش لاقية</h3>
          <p className={styles.note}>{n(insights.searchSummary.missed)} بحثًا بلا نتيجة من {n(insights.searchSummary.total)} بحثًا بعبارة خلال ٣٠ يومًا.</p>
          {insights.missedSearches.length ? <ol className={styles.rows}>{insights.missedSearches.map(item=><li key={`${item.query}-${item.village}-${item.category}`}><strong>{item.query}</strong><small>{item.village==='all'?'كل العسيرات':item.village}</small><b>{n(item.count)} مرة</b></li>)}</ol> : <p className={styles.empty}>لا توجد عبارات بحث بلا نتائج في هذه الفترة.</p>}
          <Link href="#directory-intelligence" className={styles.next}>راجع فرص إضافة خدمات ناقصة</Link>
        </div>
      </div>
      <details className={styles.definitions}><summary>كيف تُحسب الأرقام؟</summary><p>الزائر متصفح يحمل معرّفًا عشوائيًا، وليس هوية شخص مؤكدة. استخدام جهاز آخر أو مسح بيانات المتصفح قد يحسب زيارة جديدة. «تنقّلوا» عدد الزوار الذين فتحوا صفحتين مختلفتين على الأقل في اليوم نفسه؛ تحديث نفس الصفحة وحده لا يُحتسب تنقّلًا.</p><p>نستبعد صفحات الإدارة والروبوتات المعروفة ونسخ المعاينة. قد تمنع إعدادات الخصوصية تسجيل بعض الزيارات. تختلف منهجية القياس هنا عن Google Analytics، ولا نجمع أرقام المصدرين معًا. الأيام السابقة لبدء القياس غير متاحة ولا تُعرض كأصفار.</p></details>
    </> : null}
  </section>;
}
