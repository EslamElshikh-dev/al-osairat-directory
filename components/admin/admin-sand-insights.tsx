'use client';

import { useCallback, useEffect, useState } from 'react';

type Day = { date: string; requests: number; withResults: number; noResults: number };
type Insights = {
  today: number; yesterday: number; requests30d: number; withResults30d: number;
  noResults30d: number; ai30d: number; daily: Day[]; generatedAt: string;
};
const n = (value: number) => Number(value || 0).toLocaleString('ar-EG');

export function AdminSandInsights() {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/sand-insights', { cache: 'no-store', credentials: 'same-origin' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'تعذر تحميل إحصاءات سند.');
      setData(payload);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تحميل إحصاءات سند.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <section id="admin-sand" className="admin-live-panel" aria-labelledby="admin-sand-title">
    <header className="admin-live-panel__head"><div><span>سند · مؤشرات مباشرة</span><h2 id="admin-sand-title">كيف يساعد سند أهل العسيرات؟</h2><p>عدد الرسائل ووجود نتائج موثقة، من دون حفظ نص السؤال أو بيانات الزائر. يبدأ القياس من تاريخ تفعيله.</p></div><button type="button" onClick={() => void load()} disabled={loading}>تحديث</button></header>
    {error && <p role="alert" className="admin-live-panel__error">{error}</p>}
    {loading && !data ? <p>جارٍ تحميل مؤشرات سند…</p> : data ? <>
      <div className="admin-sand-metrics">
        <article><span>أسئلة اليوم</span><strong>{n(data.today)}</strong><small>بتوقيت مصر</small></article>
        <article><span>أسئلة أمس</span><strong>{n(data.yesterday)}</strong><small>بتوقيت مصر</small></article>
        <article><span>آخر ٣٠ يومًا</span><strong>{n(data.requests30d)}</strong><small>منذ بدء القياس</small></article>
        <article><span>ظهرت لها نتائج</span><strong>{n(data.withResults30d)}</strong><small>نتائج الدليل الموثقة</small></article>
        <article><span>بلا نتيجة</span><strong>{n(data.noResults30d)}</strong><small>طلبات دليل تحتاج تغطية</small></article>
        <article><span>صياغة ذكية</span><strong>{n(data.ai30d)}</strong><small>باقي الردود بحث مباشر</small></article>
      </div>
      <div className="admin-sand-daily" aria-label="نشاط سند اليومي خلال آخر ١٤ يومًا">{data.daily.map((day) => <div key={day.date}><time dateTime={day.date}>{new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', timeZone: 'Africa/Cairo' }).format(new Date(`${day.date}T12:00:00Z`))}</time><span>{n(day.requests)} سؤال</span><small>{n(day.withResults)} بنتيجة · {n(day.noResults)} بلا نتيجة</small></div>)}</div>
    </> : null}
  </section>;
}
