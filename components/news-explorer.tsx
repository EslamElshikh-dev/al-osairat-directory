'use client';
import { useMemo, useState, type ReactNode } from 'react';
import type { LocalNewsItem } from '@/lib/news';
import { NewsCard } from './news-card';
import styles from '@/app/news/news-page.module.css';
const normalize = (value:string) => value.toLowerCase().replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[\u064b-\u065f]/g,'');
export function NewsExplorer({items,pageItems,start,end,children}:{items:LocalNewsItem[];pageItems:LocalNewsItem[];start:number;end:number;children:ReactNode}) {
  const [query,setQuery]=useState('');
  const [topic,setTopic]=useState('');
  const [source,setSource]=useState('');
  const active=Boolean(query.trim()||topic||source);
  const filtered=useMemo(()=>active?items.filter(item=>(!topic||item.topic===topic)&&(!source||item.source===source)&&normalize(`${item.title} ${item.summary||''} ${item.village}`).includes(normalize(query.trim()))):pageItems,[items,pageItems,query,topic,source,active]);
  return <div className={styles.explorer}>
    <div className={styles.filters} role="search" aria-label="البحث في أخبار العسيرات">
      <label><span>ابحث في كل الأخبار</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="خبر، قرية، أو كلمة تهمّك…"/></label>
      <label><span>الموضوع</span><select value={topic} onChange={event=>setTopic(event.target.value)}><option value="">كل الموضوعات</option>{[...new Set(items.map(item=>item.topic))].map(value=><option key={value}>{value}</option>)}</select></label>
      <label><span>المصدر</span><select value={source} onChange={event=>setSource(event.target.value)}><option value="">كل المصادر</option>{[...new Set(items.map(item=>item.source))].map(value=><option key={value}>{value}</option>)}</select></label>
    </div>
    <div className={styles.resultsHead}><p role="status">{active?`${filtered.length.toLocaleString('ar-EG')} نتيجة من ${items.length.toLocaleString('ar-EG')} خبر متاح`:`عرض ${start.toLocaleString('ar-EG')}–${end.toLocaleString('ar-EG')} من ${items.length.toLocaleString('ar-EG')} خبر`}</p>{active?<button type="button" onClick={()=>{setQuery('');setTopic('');setSource('');}}>مسح التصفية</button>:null}</div>
    {filtered.length?<div className={styles.grid}>{filtered.map(item=><NewsCard key={item.id} item={item}/>)}</div>:<div className={styles.emptyState}><div><strong>لا توجد أخبار تطابق بحثك.</strong><p>جرّب كلمة أخرى أو اختَر كل المصادر والموضوعات.</p></div></div>}
    {!active?children:null}
  </div>;
}
