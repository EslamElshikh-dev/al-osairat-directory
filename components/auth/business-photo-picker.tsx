'use client';

import { useRef, useState } from 'react';
import { businessImageUrl } from '@/lib/business-images';

async function compressPhoto(file: File) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('اختر صورة JPG أو PNG أو WebP.');
  if (file.size>15*1024*1024) throw new Error('الصورة كبيرة جدًا. اختر صورة أقل من ١٥ ميجابايت.');
  const image = await createImageBitmap(file);
  try {
    const scale=Math.min(1,1400/Math.max(image.width,image.height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.width*scale)); canvas.height=Math.max(1,Math.round(image.height*scale));
    const context=canvas.getContext('2d');
    if (!context) throw new Error('تعذر تجهيز الصورة.');
    context.fillStyle='#fff'; context.fillRect(0,0,canvas.width,canvas.height); context.drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('تعذر تجهيز الصورة.')),'image/jpeg',.84));
    return new File([blob],'business.jpg',{type:'image/jpeg'});
  } finally { image.close(); }
}

export function BusinessPhotoPicker({paths,onChange,onBusy,disabled=false}:{paths:string[];onChange:(paths:string[])=>void;onBusy:(busy:boolean)=>void;disabled?:boolean}) {
  const input=useRef<HTMLInputElement>(null);
  const [uploading,setUploading]=useState(false);
  const [error,setError]=useState('');
  async function upload(files:FileList|null) {
    if (!files?.length || uploading) return;
    if (files.length+paths.length>3) { setError('يمكن إضافة ٣ صور كحد أقصى.'); return; }
    setError(''); setUploading(true); onBusy(true);
    const next=[...paths];
    try {
      for (const file of Array.from(files)) {
        const data=new FormData(); data.append('image',await compressPhoto(file));
        const response=await fetch('/api/business-images',{method:'POST',body:data,credentials:'same-origin'});
        const payload=await response.json();
        if (!response.ok) throw new Error(payload.error||'تعذر رفع الصورة.');
        next.push(payload.path); onChange([...next]);
      }
    } catch (cause) { setError(cause instanceof Error?cause.message:'تعذر رفع الصورة.'); }
    finally { setUploading(false); onBusy(false); if(input.current) input.current.value=''; }
  }
  return <fieldset className="business-photo-picker" disabled={disabled||uploading}>
    <legend>صور النشاط <small>اختياري</small></legend>
    <p>حتى ٣ صور واضحة للمكان أو الخدمات. الصورة الأولى هي غلاف النشاط. نجهّز حجمها تلقائيًا، وتظهر للناس بعد اعتماد النشاط.</p>
    <div className="business-photo-grid">{paths.map((path,index)=><figure key={path}>
      {/* Authenticated, same-origin media; private submissions must not use a shared image cache. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={businessImageUrl(path)} alt={`صورة النشاط ${index+1}`} width={160} height={120} />
      {index===0?<figcaption>غلاف النشاط</figcaption>:<button className="business-cover-choice" type="button" onClick={()=>onChange([path,...paths.filter(item=>item!==path)])}>اجعلها الغلاف</button>}
      <button type="button" onClick={()=>onChange(paths.filter(item=>item!==path))} aria-label={`إزالة الصورة ${index+1}`}>×</button>
    </figure>)}</div>
    <label className="business-photo-upload"><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled||uploading||paths.length>=3} onChange={event=>void upload(event.target.files)} /><span>{uploading?'جارٍ تجهيز الصور ورفعها…':paths.length>=3?'تم إرفاق ٣ صور':'اختيار صور من جهازك'}</span></label>
    {error?<p role="alert" className="business-submission-feedback is-error">{error}</p>:null}
  </fieldset>;
}
