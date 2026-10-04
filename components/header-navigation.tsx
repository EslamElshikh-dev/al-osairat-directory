'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const routes = [
  ['/', 'الرئيسية'], ['/directory', 'الدليل'], ['/villages', 'القرى'],
  ['/localities', 'النجوع'], ['/jobs', 'الوظائف'], ['/news', 'الأخبار'],
  ['/community', 'المجتمع'], ['/blog', 'المدونة'],
] as const;
const moreRoutes = [['/members', 'أهل الدليل'], ['/emergency', 'أرقام مهمة'], ['/install', 'ثبّت الدليل'], ['/developer', 'عن المطوّر']] as const;

export function HeaderNavigation() {
  const pathname = usePathname();
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const active = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);
  useEffect(() => { setOpenedAt(null); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpenedAt(null); trigger.current?.focus(); }
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpenedAt(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer); };
  }, [open]);

  return <div className="us-navigation" ref={root}>
    <nav className="desktop-nav" aria-label="التنقل الرئيسي">
      {routes.map(([href, title]) => <Link key={href} href={href} prefetch={false} aria-current={active(href) ? 'page' : undefined} className={href === '/community' || href === '/blog' ? 'nav-optional' : undefined}>{title}</Link>)}
    </nav>
    <button ref={trigger} type="button" className="us-menu-toggle" aria-label={open ? 'إغلاق قائمة الدليل' : 'افتح قائمة الدليل'} aria-expanded={open} aria-controls="us-site-menu" onClick={() => setOpenedAt(open ? null : pathname)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{open ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}</svg>
    </button>
    {open && <nav id="us-site-menu" className="us-menu" aria-label="كل أقسام دليل العسيرات">
      <div className="us-menu__intro"><strong>تروح فين؟</strong><span>العسيرات كلها بين إيديك</span></div>
      <div className="us-menu__routes">{[...routes, ...moreRoutes].map(([href, title]) => <Link key={href} href={href} prefetch={false} aria-current={active(href) ? 'page' : undefined} onClick={() => setOpenedAt(null)}>{title}</Link>)}</div>
    </nav>}
  </div>;
}
