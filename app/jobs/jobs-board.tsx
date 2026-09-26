'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import type { LocalJob } from '@/lib/jobs';
import { isOsairatJobArea, osairatJobAreas, widerJobAreas } from '@/lib/jobs-geography';
import styles from './jobs.module.css';

type Mode = 'offer' | 'seeker';
const workLabels: Record<NonNullable<LocalJob['work_type']>, string> = {
  'full-time': 'دوام كامل', 'part-time': 'دوام جزئي', temporary: 'عمل مؤقت', flexible: 'مرن',
};

function contactHref(job: LocalJob) {
  if (job.contact_kind === 'email') return `mailto:${job.contact_value}`;
  if (job.contact_kind === 'phone') return `tel:${job.contact_value.replace(/[^\d+]/g, '')}`;
  if (job.contact_kind === 'whatsapp') return `https://wa.me/${job.contact_value.replace(/\D/g, '')}`;
  try {
    const url = new URL(job.contact_value);
    return url.protocol === 'https:' ? url.href : '#participate';
  } catch { return '#participate'; }
}

function JobCard({ job }: { job: LocalJob }) {
  const outbound = job.contact_kind === 'whatsapp' || job.contact_kind === 'link';
  return <article className={styles.jobCard} id={`job-${job.id}`}>
    <div className={styles.cardTop}>
      <span className={styles.cardIcon} aria-hidden="true">{job.kind === 'offer' ? '↗' : '✦'}</span>
      <span className={styles.cardBadge}>{job.kind === 'seeker' ? 'باحث عن شغل' : job.origin === 'external' ? 'فرصة من مصدر عام' : 'فرصة من أهل البلد'}</span>
      <time dateTime={job.published_at}>{new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', timeZone: 'Africa/Cairo' }).format(new Date(job.published_at))}</time>
    </div>
    <h3>{job.title}</h3>
    <p className={styles.cardByline}>{job.organization || (job.kind === 'seeker' ? `خبرة من ${job.village}` : job.source_name || 'إعلان محلي')}</p>
    <div className={styles.tags}><span>⌖ {job.village}</span><span>{job.field}</span>{job.work_type && <span>{workLabels[job.work_type]}</span>}</div>
    <p className={styles.cardDescription}>{job.description}</p>
    {job.experience && <p className={styles.experience}><b>الخبرة:</b> {job.experience}</p>}
    <div className={styles.cardFoot}>
      <a href={contactHref(job)} target={outbound ? '_blank' : undefined} rel={outbound ? 'noopener noreferrer external nofollow' : undefined}>
        {job.kind === 'offer' ? 'اتواصل مع صاحب الفرصة' : 'اتواصل مع صاحب الخبرة'} <span aria-hidden="true">↗</span>
      </a>
      <small>{job.origin === 'external' ? <>المصدر: {job.source_name} · <a href={job.source_url || '#'} target="_blank" rel="noopener noreferrer external nofollow">الإعلان الأصلي</a></> : 'نُشرت وسيلة التواصل بموافقة صاحب الإعلان'}</small>
    </div>
  </article>;
}

function PublishForm({ mode, places }: { mode: Mode; places: string[] }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setState('sending'); setMessage('');
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: mode, title: fields.get('title'), organization: fields.get('organization'), village: fields.get('village'),
          field: fields.get('field'), description: fields.get('description'), experience: fields.get('experience'),
          workType: fields.get('workType'), contactKind: fields.get('contactKind'), contactValue: fields.get('contactValue'),
          consent: fields.get('consent') === 'on',
        }),
      });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || 'حصلت مشكلة، حاول من جديد.'); setState('idle'); return; }
      setState('sent'); form.reset();
    } catch { setMessage('الاتصال قطع قبل ما يوصل إعلانك. حاول من جديد.'); setState('idle'); }
  }

  return <div className={styles.formPanel}>
    <div className={styles.formHead}><span>من أهل البلد</span><h3>{mode === 'offer' ? 'عندك شغل لحد من عندنا؟' : 'عرّف الناس عليك وعلى خبرتك'}</h3><p>املأ التفاصيل الواضحة، وهنراجعها قبل النشر. وسيلة التواصل هتظهر للناس بعد موافقتك.</p></div>
    {state === 'sent' ? <div className={styles.success} role="status"><b>طلبك وصل يا طيب ✓</b><p>هنراجعه، وبعد الموافقة هيظهر في صفحة الوظائف وشريط الأخبار.</p><button type="button" onClick={() => setState('idle')}>إضافة إعلان جديد</button></div> : <form onSubmit={submit} className={styles.form}>
      <div className={styles.twoFields}>
        <label>{mode === 'offer' ? 'المسمى الوظيفي' : 'اسمك والمهنة'}<input name="title" required minLength={5} maxLength={160} placeholder={mode === 'offer' ? 'مثال: مطلوب محاسب في أولاد حمزة' : 'مثال: أحمد · فني صيانة'} /></label>
        {mode === 'offer' && <label>اسم النشاط أو جهة العمل<input name="organization" maxLength={120} placeholder="اكتب اسم المكان لو متاح" /></label>}
      </div>
      <div className={styles.twoFields}>
        <label>منطقة العمل في سوهاج<select name="village" required defaultValue=""><option value="" disabled>اختار المركز أو القرية</option><optgroup label="العسيرات وقراها">{places.filter(isOsairatJobArea).map((place) => <option value={place} key={place}>{place}</option>)}</optgroup><optgroup label="باقي مراكز سوهاج ومناطقها">{places.filter((place) => !isOsairatJobArea(place)).map((place) => <option value={place} key={place}>{place}</option>)}</optgroup></select></label>
        <label>المجال<input name="field" required minLength={2} maxLength={80} placeholder="تعليم، تجارة، حرفة…" /></label>
      </div>
      <label>{mode === 'offer' ? 'تفاصيل الفرصة والشروط' : 'خبرتك ونوع الشغل اللي بتدور عليه'}<textarea name="description" required minLength={20} maxLength={2000} rows={5} placeholder="قول للناس التفاصيل المهمة من غير بيانات حساسة" /></label>
      <div className={styles.twoFields}>
        <label>الخبرة <small>اختياري</small><input name="experience" maxLength={300} placeholder="مثال: سنتان في المجال" /></label>
        <label>نظام الشغل <small>اختياري</small><select name="workType" defaultValue=""><option value="">غير محدد</option><option value="full-time">دوام كامل</option><option value="part-time">دوام جزئي</option><option value="temporary">مؤقت</option><option value="flexible">مرن</option></select></label>
      </div>
      <div className={styles.twoFields}>
        <label>طريقة التواصل<select name="contactKind" required defaultValue="whatsapp"><option value="whatsapp">واتساب</option><option value="phone">اتصال</option><option value="email">بريد إلكتروني</option><option value="link">رابط تقديم</option></select></label>
        <label>رقمك أو بريدك أو رابط التقديم<input name="contactValue" required minLength={6} maxLength={500} dir="auto" placeholder="مثال: 01012345678" /></label>
      </div>
      <label className={styles.consent}><input type="checkbox" name="consent" required /><span>أوافق على نشر تفاصيل الإعلان ووسيلة التواصل بعد المراجعة، وأقر إن البيانات صحيحة.</span></label>
      {message && <p className={styles.error} role="alert">{message}{message.includes('دخول') && <> <Link href="/account/login">تسجيل الدخول</Link></>}</p>}
      <button className={styles.submit} type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'بنرسل إعلانك…' : 'ابعت الإعلان للمراجعة ←'}</button>
      <small className={styles.formNote}>يلزم حساب موثق في دليل العسيرات. لا يظهر إعلانك إلا بعد المراجعة.</small>
    </form>}
  </div>;
}

export function JobsBoard({ jobs, places, available }: { jobs: LocalJob[]; places: string[]; available: boolean }) {
  const [kind, setKind] = useState<Mode>('offer');
  const [publishKind, setPublishKind] = useState<Mode>('offer');
  const [scope, setScope] = useState<'all' | 'osairat' | 'sohag'>('all');
  const [village, setVillage] = useState('');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => jobs.filter((job) => {
    const matches = [job.title, job.field, job.description, job.organization || ''].join(' ').toLocaleLowerCase('ar').includes(query.trim().toLocaleLowerCase('ar'));
    return job.kind === kind && (!village || job.village === village)
      && (scope === 'all' || (scope === 'osairat' ? isOsairatJobArea(job.village) : !isOsairatJobArea(job.village))) && matches;
  }), [jobs, kind, village, query, scope]);
  const offers = jobs.filter((job) => job.kind === 'offer').length;
  const seekers = jobs.length - offers;

  return <>
    <section className={`shell ${styles.board}`} id="opportunities" aria-labelledby="jobs-board-title">
      <div className={styles.sectionHeading}><div><span>فرص من العسيرات لكل سوهاج</span><h2 id="jobs-board-title">دوّر في بلدك، ووسّع دايرة الفرص</h2><p>اختار العسيرات وقراها أو بقية المراكز. مشاركات الأهالي بتتراجع قبل النشر، والفرص من مصادر عامة معاها رابط الأصل؛ اتأكد من استمرار الإعلان وشروطه قبل التقديم.</p></div><strong>{jobs.length.toLocaleString('ar-EG')} إعلان منشور</strong></div>
      <div className={styles.boardFrame}>
        <div className={styles.tabs} role="group" aria-label="نوع الإعلانات"><button type="button" aria-pressed={kind === 'offer'} onClick={() => setKind('offer')}>فرص عمل <b>{offers.toLocaleString('ar-EG')}</b></button><button type="button" aria-pressed={kind === 'seeker'} onClick={() => setKind('seeker')}>باحثون عن شغل <b>{seekers.toLocaleString('ar-EG')}</b></button></div>
        <div className={styles.scope} role="group" aria-label="نطاق الوظائف"><button type="button" aria-pressed={scope === 'all'} onClick={() => { setScope('all'); setVillage(''); }}>كل سوهاج</button><button type="button" aria-pressed={scope === 'osairat'} onClick={() => { setScope('osairat'); setVillage(''); }}>العسيرات وقراها</button><button type="button" aria-pressed={scope === 'sohag'} onClick={() => { setScope('sohag'); setVillage(''); }}>باقي المراكز</button></div>
        <div className={styles.filters}><label>ابحث عن وظيفة أو مهارة<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="مثال: محاسب، نجار، تعليم…" type="search" /></label><label>المركز أو القرية<select value={village} onChange={(event) => setVillage(event.target.value)}><option value="">كل المناطق في النطاق</option>{scope !== 'sohag' && <optgroup label="العسيرات وقراها">{osairatJobAreas.map((place) => <option key={place} value={place}>{place}</option>)}</optgroup>}{scope !== 'osairat' && <optgroup label="مراكز سوهاج ومناطقها">{widerJobAreas.map((place) => <option key={place} value={place}>{place}</option>)}</optgroup>}</select></label></div>
        {!available ? <div className={styles.empty} role="status"><span aria-hidden="true">⌕</span><h3>الإعلانات مش متاحة دلوقتي</h3><p>جرب تفتح الصفحة كمان شوية، وإعلانك تقدر تبعته لما الخدمة ترجع.</p></div> : filtered.length ? <div className={styles.grid}>{filtered.map((job) => <JobCard key={job.id} job={job} />)}</div> : <div className={styles.empty}><span aria-hidden="true">✦</span><h3>{jobs.length ? 'مفيش نتيجة مطابقة لبحثك' : 'لسه مفيش إعلانات منشورة'}</h3><p>{jobs.length ? 'جرّب مجال تاني أو اختار كل سوهاج.' : 'خلي البداية من عندك؛ اعرض فرصة أو اكتب خبرتك عشان أهل البلد يشوفوها بعد المراجعة.'}</p><a href="#participate">انشر إعلانك ←</a></div>}
      </div>
    </section>
    <section className={styles.participate} id="participate"><div className={`shell ${styles.participateGrid}`}><div className={styles.participateCopy}><span>المعلومة توصل لصاحبها</span><h2>باب رزق <em>للبلد كلها.</em></h2><p>وظيفة بسيطة عندك ممكن تغيّر يوم واحد من أهل العسيرات أو حد من مراكز سوهاج. وخبرتك يمكن صاحب الشغل مستني يسمع عنها.</p><ul><li><b>01</b> اكتب التفاصيل ومكان الفرصة أو الخبرة.</li><li><b>02</b> هنراجع الإعلان قبل نشره.</li><li><b>03</b> يظهر للناس مع وسيلة التواصل اللي وافقت عليها.</li></ul></div><div className={styles.publishBox}><div className={styles.publishTabs} role="group" aria-label="نوع الإعلان"><button type="button" aria-pressed={publishKind === 'offer'} onClick={() => setPublishKind('offer')}>عندي وظيفة</button><button type="button" aria-pressed={publishKind === 'seeker'} onClick={() => setPublishKind('seeker')}>بدور على شغل</button></div><PublishForm key={publishKind} mode={publishKind} places={places} /></div></div></section>
  </>;
}
