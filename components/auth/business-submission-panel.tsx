'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { categories, villages } from '@/lib/data/base';
import { normalizeGoogleMapsUrl, validateBusinessSubmissionInput } from '@/lib/business-submission-validation';
import { BusinessPhotoPicker } from './business-photo-picker';

type FormState = { businessName:string; category:string; village:string; locationDetails:string; phone:string; whatsapp:string; description:string; googleMapsUrl:string; websiteUrl:string; imagePaths:string[]; contactPublishConsent:boolean };
type Submission = FormState & { id:string; categoryLabel:string; status:'pending'|'needs_changes'|'approved'|'rejected';reviewNote:string;createdAt:string };
const empty:FormState={businessName:'',category:'',village:'',locationDetails:'',phone:'',whatsapp:'',description:'',googleMapsUrl:'',websiteUrl:'',imagePaths:[],contactPublishConsent:false};
const allowedCategories=categories.filter(category=>!['emergency','government'].includes(category.id));
const statuses={pending:'قيد المراجعة',needs_changes:'يحتاج استكمال',approved:'تم الاعتماد',rejected:'لم يُعتمد'};
const date=(value:string)=>new Intl.DateTimeFormat('ar-EG',{day:'numeric',month:'short',timeZone:'Africa/Cairo'}).format(new Date(value));

export function BusinessSubmissionPanel() {
  const [form,setForm]=useState<FormState>(empty);
  const [contactKind,setContactKind]=useState('both');
  const [contact,setContact]=useState('');
  const [contactChanged,setContactChanged]=useState(false);
  const [linkChanged,setLinkChanged]=useState(false);
  const [link,setLink]=useState('');
  const [submissions,setSubmissions]=useState<Submission[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [requestId,setRequestId]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const formRef=useRef<HTMLFormElement>(null);
  useEffect(()=>{
    let active=true;
    fetch('/api/business-submissions',{cache:'no-store',credentials:'same-origin'}).then(async response=>{
      const payload=await response.json();
      if(!response.ok) throw new Error(payload.error||'تعذر تحميل طلباتك.');
      if(active)setSubmissions(payload.submissions||[]);
    }).catch(cause=>{if(active)setError(cause.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[]);
  function update<K extends keyof FormState>(key:K,value:FormState[K]) {setForm(current=>({...current,[key]:value}));setError('');setMessage('');}
  function reset(){setForm(empty);setContact('');setContactKind('both');setLink('');setRequestId('');setContactChanged(false);setLinkChanged(false);}
  function revise(item:Submission){
    setContactChanged(false);setLinkChanged(false);setForm({...empty,...item});setRequestId(item.id);setContact(item.phone||item.whatsapp);
    setContactKind(item.phone&&item.whatsapp?'both':item.whatsapp?'whatsapp':'phone');
    setLink(item.googleMapsUrl||item.websiteUrl||'');setError('');setMessage('');
    formRef.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(saving||uploading)return;
    const maps=normalizeGoogleMapsUrl(link);
    const values={...form,phone:requestId&&!contactChanged?form.phone:contactKind==='whatsapp'?'':contact,whatsapp:requestId&&!contactChanged?form.whatsapp:contactKind==='phone'?'':contact,googleMapsUrl:requestId&&!linkChanged?form.googleMapsUrl:maps,websiteUrl:requestId&&!linkChanged?form.websiteUrl:maps?'':link};
    const invalid=validateBusinessSubmissionInput(values);
    if(invalid){setError(invalid);return;}
    setSaving(true);setError('');setMessage('');
    try{
      const response=await fetch('/api/business-submissions',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({...values,requestId})});
      const payload=await response.json();if(!response.ok)throw new Error(payload.error||'تعذر إرسال الطلب.');
      setSubmissions(current=>[payload.submission,...current.filter(item=>item.id!==payload.submission.id)]);
      reset();setMessage('وصل طلبك إلى مالك الدليل. تابع حالته هنا، وسيصلك إشعار بعد المراجعة.');
      window.dispatchEvent(new Event('notifications:changed'));
    }catch(cause){setError(cause instanceof Error?cause.message:'تعذر إرسال الطلب.');}
    finally{setSaving(false);}
  }
  return <section className="business-submission-panel" aria-labelledby="business-submission-title">
    <header className="business-submission-heading"><div className="business-submission-heading__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 21V8l8-5 8 5v13M8 21v-6h8v6M8 9h8M12 5v8"/></svg></div><div><span>نشاطك أقرب لأهل بلدك</span><h2 id="business-submission-title">{requestId?'استكمل طلب نشاطك':'أضف نشاطك إلى الدليل'}</h2><p>عرّف الناس بخدمتك. اكتب البيانات وأرسلها إلى مالك الدليل للمراجعة.</p></div></header>
    <ol className="business-request-steps" aria-label="مراحل الطلب"><li><b>١</b>اكتب البيانات</li><li><b>٢</b>أرسل للمراجعة</li><li><b>٣</b>تابع الاعتماد</li></ol>
    <form ref={formRef} className="business-submission-form" onSubmit={submit}>
      <BusinessPhotoPicker paths={form.imagePaths} onChange={paths=>update('imagePaths',paths)} onBusy={setUploading} disabled={saving}/>
      <div className="business-submission-grid">
        <label><span>اسم النشاط <b>*</b></span><input name="businessName" value={form.businessName} onChange={event=>update('businessName',event.target.value)} minLength={2} maxLength={120} placeholder="الاسم اللي الناس تعرف نشاطك بيه" required autoComplete="organization"/></label>
        <label><span>الفئة <b>*</b></span><select value={form.category} onChange={event=>update('category',event.target.value)} required><option value="">اختر فئة النشاط</option>{allowedCategories.map(category=><option value={category.id} key={category.id}>{category.label}</option>)}</select></label>
        <label className="business-submission-field--wide"><span>رقم الاتصال أو الواتساب <b>*</b></span><div className="business-contact-row"><input aria-label="رقم التواصل" dir="ltr" inputMode="tel" value={contact} onChange={event=>{setContactChanged(true);setContact(event.target.value);}} maxLength={24} placeholder="01xxxxxxxxx" required/><select aria-label="استخدام رقم التواصل" value={contactKind} onChange={event=>{setContactChanged(true);setContactKind(event.target.value);}}><option value="both">اتصال وواتساب</option><option value="phone">اتصال فقط</option><option value="whatsapp">واتساب فقط</option></select></div><small>رقم النشاط الذي تريد إظهاره للجمهور بعد الاعتماد. للرقم الأرضي اختر «اتصال فقط».</small></label>
        <label><span>القرية <small>اختياري</small></span><select value={form.village} onChange={event=>update('village',event.target.value)}><option value="">مركز العسيرات</option>{villages.filter(item=>item.name!=='مركز العسيرات').map(item=><option value={item.name} key={item.slug}>{item.name}</option>)}</select></label>
        <label><span>العنوان <small>اختياري</small></span><input value={form.locationDetails} onChange={event=>update('locationDetails',event.target.value)} maxLength={240} placeholder="الشارع أو أقرب علامة مميزة، إن وُجد"/></label>
        <label className="business-submission-field--wide"><span>رابط النشاط على خرائط Google أو الموقع الإلكتروني <small>اختياري</small></span><input dir="ltr" inputMode="url" value={link} onChange={event=>{setLinkChanged(true);setLink(event.target.value);}} maxLength={500} placeholder="https://maps.app.goo.gl/… أو https://…"/></label>
        <label className="business-submission-field--wide"><span>تفاصيل عن النشاط <b>*</b></span><textarea value={form.description} onChange={event=>update('description',event.target.value)} minLength={10} maxLength={800} rows={5} placeholder="بتقدّم إيه؟ اذكر خدماتك، تخصصك، ومواعيدك إن أحببت." required/><small>{form.description.length.toLocaleString('ar-EG')} / ٨٠٠ حرف</small></label>
      </div>
      {form.category==='transport'?<label className="business-contact-consent"><input type="checkbox" checked={form.contactPublishConsent} onChange={event=>update('contactPublishConsent',event.target.checked)} required/>أوافق على نشر هذا الرقم للتواصل العام بشأن خدمة النقل.</label>:null}
      <div className="business-submission-form__note"><strong>طلبك يصل إلى مالك الدليل فقط</strong><p>تظل البيانات والصور للمراجعة، ويظهر النشاط للناس بعد الاعتماد. يمكنك متابعة الحالة وملاحظات المراجعة في «طلباتي».</p></div>
      {error?<div className="business-submission-feedback is-error" role="alert">{error}</div>:null}
      {message?<div className="business-submission-feedback is-success" role="status">{message}</div>:null}
      <div className="business-submission-submit-row"><span>الحقول المعلّمة بنجمة مطلوبة.</span>{requestId?<button type="button" onClick={reset} disabled={saving||uploading}>إلغاء الاستكمال</button>:null}<button type="submit" disabled={saving||uploading}>{saving?'جارٍ إرسال الطلب…':uploading?'انتظر اكتمال الصور…':requestId?'إعادة إرسال الطلب':'إرسال'}</button></div>
    </form>
    <div className="member-submissions" aria-labelledby="member-submissions-title"><header className="member-submissions__heading"><div><span>كل خطوة واضحة</span><h3 id="member-submissions-title">طلباتي</h3></div><span>{loading?'…':submissions.length.toLocaleString('ar-EG')}</span></header>
      {loading?<p className="member-submissions__empty">جارٍ تحميل الطلبات…</p>:submissions.length?<div className="member-submissions__list">{submissions.map(item=><article className="member-submission-item" key={item.id}><div className="member-submission-item__main"><div className="member-submission-item__title"><h4>{item.businessName}</h4><span className={`submission-status submission-status--${item.status}`}>{statuses[item.status]}</span></div><p>{item.categoryLabel} · {item.village}</p>{item.reviewNote?<div className="submission-review-note"><strong>ملاحظة المراجعة:</strong> {item.reviewNote}</div>:null}{item.status==='needs_changes'?<button type="button" className="business-revise-button" onClick={()=>revise(item)} disabled={saving||uploading}>استكمال البيانات وإعادة الإرسال</button>:null}</div><div className="member-submission-item__meta"><span>أُرسل</span><b>{date(item.createdAt)}</b></div></article>)}</div>:<p className="member-submissions__empty">بعد إرسال نشاطك، ستظهر حالته هنا.</p>}
    </div>
  </section>;
}
