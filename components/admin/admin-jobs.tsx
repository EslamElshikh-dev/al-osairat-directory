'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { osairatJobAreas, widerJobAreas } from '@/lib/jobs-geography';

type Job = {
  id: string; kind: 'offer' | 'seeker'; title: string; village: string; field: string;
  description: string; contact_kind: string; contact_value: string;
  origin: 'community' | 'external'; source_name: string | null; source_url: string | null;
  status: 'pending' | 'approved' | 'rejected'; created_at: string;
};

export function AdminJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    const response = await fetch('/api/admin/jobs', { cache: 'no-store' });
    if (!response.ok) { setMessage('تعذر تحميل إعلانات الوظائف.'); setLoading(false); return; }
    const data = await response.json(); setJobs(data.jobs || []); setLoading(false);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function review(id: string, status: 'approved' | 'rejected') {
    setSaving(id); setMessage('');
    const response = await fetch('/api/admin/jobs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }).catch(() => null);
    if (!response?.ok) setMessage('تعذر تحديث حالة الإعلان.');
    else await load();
    setSaving('');
  }

  async function addSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const entries = Object.fromEntries(new FormData(form));
    setSaving('source'); setMessage('');
    const response = await fetch('/api/admin/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entries) }).catch(() => null);
    const result = await response?.json().catch(() => ({}));
    if (!response?.ok) setMessage(result?.error || 'تعذر إضافة الإعلان.');
    else { form.reset(); setMessage('اتضافت الفرصة بمصدرها الأصلي.'); await load(); }
    setSaving('');
  }

  const pending = jobs.filter((job) => job.status === 'pending');
  return <section id="admin-jobs" className="admin-jobs" aria-labelledby="admin-jobs-title">
    <div className="admin-jobs__heading"><div><span>فرص أهل العسيرات</span><h2 id="admin-jobs-title">مراجعة الوظائف والباحثين عن عمل</h2><p>تظهر الإعلانات بعد اعتمادها فقط. راجع التفاصيل ووسيلة التواصل قبل النشر.</p></div><b>{pending.length.toLocaleString('ar-EG')} قيد المراجعة</b></div>
    <div className="admin-jobs__grid">
      <div className="admin-jobs__queue">
        {loading ? <p>بنجيب الإعلانات…</p> : pending.length ? pending.map((job) => <article key={job.id} className="admin-jobs__card"><div><span>{job.kind === 'offer' ? 'وظيفة' : 'باحث عن شغل'} · {job.village} · {job.field}</span><h3>{job.title}</h3><p>{job.description}</p><small>تواصل: {job.contact_kind} · <b dir="auto">{job.contact_value}</b></small></div><div className="admin-jobs__actions"><button type="button" disabled={Boolean(saving)} onClick={() => review(job.id, 'approved')}>اعتماد ونشر</button><button type="button" disabled={Boolean(saving)} onClick={() => review(job.id, 'rejected')}>رفض</button></div></article>) : <p>كل طلبات الوظائف اتراجعت لحد دلوقتي.</p>}
      </div>
      <form onSubmit={addSource} className="admin-jobs__source"><span>مصدر خارجي واضح</span><h3>أضف فرصة موثقة من مصدرها</h3><p>اكتب إعلانًا حقيقيًا في أحد مراكز سوهاج أو قرى العسيرات، والرابط الأصلي يكون ظاهر للزائر.</p><label>المسمى<input name="title" required minLength={5} maxLength={160} /></label><label>الجهة<input name="organization" maxLength={120} /></label><label>منطقة العمل<select name="village" required defaultValue=""><option value="" disabled>اختار المركز أو القرية</option><optgroup label="العسيرات وقراها">{osairatJobAreas.map((place) => <option key={place}>{place}</option>)}</optgroup><optgroup label="باقي سوهاج">{widerJobAreas.map((place) => <option key={place}>{place}</option>)}</optgroup></select></label><label>المجال<input name="field" required minLength={2} maxLength={80} /></label><label>التفاصيل<textarea name="description" required minLength={20} maxLength={2000} rows={4} /></label><label>اسم المصدر<input name="sourceName" required maxLength={120} /></label><label>رابط الإعلان الأصلي<input name="sourceUrl" type="url" required pattern="https://.*" /></label><button type="submit" disabled={Boolean(saving)}>أضف الفرصة ←</button></form>
    </div>
    {message && <p className="admin-jobs__message" role="status">{message}</p>}
  </section>;
}
