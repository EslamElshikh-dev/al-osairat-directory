'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './public-updates.module.css';

type Update = { id: string; type: 'news' | 'job' | 'article'; title: string; summary: string; href: string; publishedAt: string };
const STORAGE_KEY = 'osairat:public-updates:seen:v1';
const labels = { news: 'خبر', job: 'وظيفة', article: 'مقال' };

function seenIds(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(-100) : [];
  } catch { return []; }
}

function dateLabel(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'Africa/Cairo', day: 'numeric', month: 'short',
    }).format(new Date(value));
  } catch { return ''; }
}

export function PublicUpdates() {
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/public-updates', { cache: 'no-store' });
      if (!response.ok) throw new Error('UPDATES_UNAVAILABLE');
      const data = await response.json();
      const list: Update[] = Array.isArray(data.updates) ? data.updates : [];
      setUpdates(list);
      const seen = new Set(seenIds());
      const recentCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
      setUnread(list.filter((item) => !seen.has(item.id) && Date.parse(item.publishedAt) >= recentCutoff).length);
      setError('');
    } catch {
      setError('تعذر تحميل الإضافات الآن.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!open || !updates.length) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(
        [...new Set([...seenIds(), ...updates.map((item) => item.id)])].slice(-100),
      ));
    } catch { /* Optional per-browser read state. */ }
    setUnread(0);
  }, [open, updates]);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    void load();
    try {
      const ids = [...new Set([...seenIds(), ...updates.map((item) => item.id)])].slice(-100);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch { /* Optional per-browser read state. */ }
    setUnread(0);
  }

  return <div className={styles.root} ref={root}>
    <button type="button" className={styles.trigger} onClick={toggle}
      aria-label={unread ? `آخر إضافات الدليل، ${unread} جديدة` : 'آخر إضافات الدليل'}
      aria-expanded={open} aria-controls="osairat-public-updates">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5.5h12.5v13H5.5A2.5 2.5 0 0 1 3 16V6.5a1 1 0 0 1 1-1Z" /><path d="M16.5 8H21v8a2.5 2.5 0 0 1-2.5 2.5H6" /><path d="M6.5 9h7M6.5 12h7M6.5 15h4" />
      </svg>
      {unread > 0 ? <span className={styles.badge} aria-hidden="true">{unread > 9 ? '9+' : unread}</span> : null}
    </button>
    {open ? <section id="osairat-public-updates" className={styles.panel} aria-label="آخر إضافات الدليل">
      <div className={styles.head}><div><small>من المحتوى المنشور</small><strong>آخر إضافات العسيرات</strong></div><button type="button" onClick={() => setOpen(false)} aria-label="إغلاق">×</button></div>
      {error ? <p className={styles.state}>{error} <button type="button" onClick={() => void load()}>إعادة المحاولة</button></p> :
        updates.length ? <ul className={styles.list}>{updates.map((item) =>
          <li key={item.id}><Link href={item.href} onClick={() => setOpen(false)}>
            <span className={styles.tag}>{labels[item.type]}</span>
            <span className={styles.copy}><strong>{item.title}</strong><small>{item.summary} · {dateLabel(item.publishedAt)}</small></span>
            <span aria-hidden="true">←</span>
          </Link></li>
        )}</ul> : <p className={styles.state}>لا توجد إضافات منشورة مؤخرًا.</p>}
      <div className={styles.footer}><Link href="/news" onClick={() => setOpen(false)}>الأخبار</Link><Link href="/jobs" onClick={() => setOpen(false)}>الوظائف</Link><Link href="/blog" onClick={() => setOpen(false)}>المدونة</Link></div>
    </section> : null}
  </div>;
}
