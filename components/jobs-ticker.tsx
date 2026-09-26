'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Headline = { tag: string; text: string; href: string };

export function JobsTicker() {
  const [items, setItems] = useState<Headline[]>([]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (document.visibilityState !== 'visible') return;
      const response = await fetch('/api/jobs', { cache: 'no-store' }).catch(() => null);
      if (!response?.ok) return;
      const data = await response.json().catch(() => ({}));
      if (active) setItems(Array.isArray(data.items) ? data.items : []);
    };
    void load();
    const timer = window.setInterval(() => { void load(); }, 180_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  return <div className="shell jobs-ticker" aria-label="فرص العمل المحلية">
    <Link href="/jobs" className="jobs-ticker__label">✦ فرص العسيرات وسوهاج</Link>
    {items.length ? <div className="jobs-ticker__viewport"><div className="jobs-ticker__track">
      {[...items, ...items].map((item, index) => <Link href={item.href} key={`${item.href}-${index}`} tabIndex={index >= items.length ? -1 : undefined} aria-hidden={index >= items.length ? true : undefined}><b>{item.tag}</b> {item.text}</Link>)}
    </div></div> : <p>عندك وظيفة أو خبرة؟ خلي أهل البلد يعرفوا.</p>}
    <Link href="/jobs#participate" className="jobs-ticker__action">شارك فرصة <span aria-hidden="true">←</span></Link>
  </div>;
}
