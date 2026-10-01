'use client';

import { useState } from 'react';

export function NewsShare({ title, url }: { title: string; url: string }) {
  const [message, setMessage] = useState('');
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; }
      catch (error) { if (error instanceof Error && error.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); setMessage('تم نسخ رابط الخبر'); }
    catch { setMessage('يمكنك نسخ رابط الخبر من شريط العنوان.'); }
  }
  return <section className="us-news-share" aria-label="مشاركة الخبر">
    <div><strong>الخبر يستاهل يوصل لأهل البلد</strong><p>شارك رابط الخبر بعنوانه ومصدره من دليل العسيرات.</p></div>
    <div className="us-news-share__actions"><button type="button" onClick={share}>مشاركة الخبر</button><a href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`} target="_blank" rel="noopener noreferrer">واتساب</a></div>
    <span role="status">{message}</span>
  </section>;
}
