'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

type SearchItem = {
  kind: 'listing' | 'category' | 'village' | 'article' | 'page';
  title: string;
  subtitle: string;
  href: string;
  badge: string;
};

type SearchResponse = {
  query?: string;
  items?: SearchItem[];
  total?: number;
  error?: string;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.7" />
      <path d="m14.8 14.8 4.2 4.2" />
    </svg>
  );
}

function resultGlyph(kind: SearchItem['kind']) {
  if (kind === 'listing') return '⌖';
  if (kind === 'category') return '▦';
  if (kind === 'village') return '⌂';
  if (kind === 'article') return '≡';
  return '↗';
}

export function GlobalSearch() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length >= 2;
  const statusText = useMemo(() => {
    if (!hasQuery) return 'اكتب حرفين على الأقل لبدء البحث.';
    if (loading) return 'جارٍ البحث…';
    if (error) return error;
    if (!items.length) return 'لا توجد نتائج مطابقة.';
    if (items.length === 1) return 'نتيجة سريعة واحدة';
    if (items.length === 2) return 'نتيجتان سريعتان';
    return `${items.length.toLocaleString('ar-EG')} نتائج سريعة`;
  }, [error, hasQuery, items.length, loading]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !hasQuery) {
      requestRef.current?.abort();
      setItems([]);
      setError('');
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    const timer = window.setTimeout(async () => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/site-search?q=${encodeURIComponent(trimmedQuery)}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({})) as SearchResponse;
        if (!response.ok) throw new Error(data.error || 'تعذر تنفيذ البحث الآن.');
        setItems(Array.isArray(data.items) ? data.items : []);
        setActiveIndex(-1);
      } catch (searchError) {
        if ((searchError as Error)?.name === 'AbortError') return;
        setItems([]);
        setError(searchError instanceof Error ? searchError.message : 'تعذر تنفيذ البحث الآن.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [hasQuery, open, trimmedQuery]);

  function closeAndNavigate(href: string) {
    setOpen(false);
    setActiveIndex(-1);
    router.push(href);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trimmedQuery) return;
    if (activeIndex >= 0 && items[activeIndex]) {
      closeAndNavigate(items[activeIndex].href);
      return;
    }
    closeAndNavigate(`/directory?q=${encodeURIComponent(trimmedQuery)}`);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!items.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => current >= items.length - 1 ? 0 : current + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => current <= 0 ? items.length - 1 : current - 1);
    }
  }

  return (
    <div ref={rootRef} className={`global-search${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="header-mobile-action global-search__trigger"
        aria-label="البحث في دليل العسيرات"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <SearchIcon />
        <span>بحث</span>
      </button>

      {open ? (
        <div className="global-search__panel" role="dialog" aria-label="البحث في دليل العسيرات">
          <div className="global-search__head">
            <div>
              <span>بحث سريع</span>
              <strong>ابحث في دليل العسيرات كاملًا</strong>
            </div>
            <button type="button" className="global-search__close" aria-label="إغلاق البحث" onClick={() => setOpen(false)}>×</button>
          </div>

          <form className="global-search__form" role="search" onSubmit={submitSearch}>
            <span className="global-search__field-icon"><SearchIcon /></span>
            <label className="sr-only" htmlFor="global-site-search">ابحث في الموقع</label>
            <input
              ref={inputRef}
              id="global-site-search"
              value={query}
              onChange={(event) => setQuery(event.target.value.slice(0, 100))}
              onKeyDown={handleInputKeyDown}
              placeholder="نشاط، خدمة، قرية، قسم أو مقال…"
              autoComplete="off"
              inputMode="search"
              aria-controls="global-search-results"
              aria-activedescendant={activeIndex >= 0 ? `global-search-result-${activeIndex}` : undefined}
            />
            {query ? <button type="button" className="global-search__clear" onClick={() => setQuery('')} aria-label="مسح البحث">مسح</button> : null}
            <button type="submit" className="global-search__submit">بحث</button>
          </form>

          <div className={`global-search__status${error ? ' is-error' : ''}`} aria-live="polite">
            <span>{statusText}</span>
            {hasQuery && !loading && !error ? <small>اضغط Enter لعرض جميع النتائج</small> : null}
          </div>

          <div id="global-search-results" className="global-search__results" role="listbox" aria-label="نتائج البحث السريع">
            {loading ? (
              <div className="global-search__loading" aria-hidden="true"><span /><span /><span /></div>
            ) : items.length ? (
              items.map((item, index) => (
                <button
                  key={`${item.kind}-${item.href}`}
                  id={`global-search-result-${index}`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  className={`global-search__result${activeIndex === index ? ' is-active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => closeAndNavigate(item.href)}
                >
                  <span className={`global-search__result-icon kind-${item.kind}`} aria-hidden="true">{resultGlyph(item.kind)}</span>
                  <span className="global-search__result-copy">
                    <span><strong>{item.title}</strong><i>{item.badge}</i></span>
                    <small>{item.subtitle}</small>
                  </span>
                  <b aria-hidden="true">←</b>
                </button>
              ))
            ) : hasQuery && !loading && !error ? (
              <div className="global-search__empty">
                <span aria-hidden="true">⌕</span>
                <strong>لا توجد نتيجة مباشرة</strong>
                <small>اضغط Enter لإجراء بحث موسّع داخل الدليل.</small>
              </div>
            ) : (
              <div className="global-search__suggestions">
                <button type="button" onClick={() => setQuery('صيدلية')}>صيدلية</button>
                <button type="button" onClick={() => setQuery('طبيب')}>طبيب</button>
                <button type="button" onClick={() => setQuery('أولاد حمزة')}>أولاد حمزة</button>
                <button type="button" onClick={() => setQuery('كهربائي')}>كهربائي</button>
              </div>
            )}
          </div>

          <div className="global-search__footer">
            <span>بحث موحد في الأنشطة والأقسام والقرى والمقالات</span>
            <button type="button" onClick={() => closeAndNavigate('/directory')}>فتح الدليل الكامل ←</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
