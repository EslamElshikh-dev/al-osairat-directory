'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

type SearchItem = {
  kind: 'listing' | 'category' | 'village' | 'locality' | 'article' | 'page';
  title: string;
  subtitle: string;
  href: string;
  badge: string;
};

type SearchResponse = {
  items?: SearchItem[];
  error?: string;
};

type VillageOption = {
  name: string;
  slug: string;
};

type RecentSearch = {
  query: string;
  village: string;
};

const recentSearchesKey = 'osairat-smart-searches-v1';
const popularNeeds = ['دكتور', 'صيدلية', 'مدرسة', 'كهربائي', 'سباك', 'مواصلات', 'مطعم', 'محامي'];

function safeRecentSearches(value: string | null): RecentSearch[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is RecentSearch => Boolean(
        item && typeof item === 'object'
        && typeof (item as RecentSearch).query === 'string'
        && typeof (item as RecentSearch).village === 'string',
      ))
      .slice(0, 3);
  } catch {
    return [];
  }
}

function glyphForKind(kind: SearchItem['kind']) {
  if (kind === 'listing') return '⌖';
  if (kind === 'category') return '▦';
  if (kind === 'village') return '⌂';
  if (kind === 'locality') return '◇';
  if (kind === 'article') return '≡';
  return '↗';
}

export function SmartLocalCompass({
  villages,
  initialQuery = '',
  initialVillage = 'all',
  variant = 'hero',
}: {
  villages: VillageOption[];
  initialQuery?: string;
  initialVillage?: string;
  variant?: 'hero' | 'catalog';
}) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [village, setVillage] = useState(initialVillage || 'all');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const normalizedQuery = query.trim();
  const canSuggest = normalizedQuery.length >= 2;
  const panelOpen = focused && canSuggest;

  useEffect(() => {
    try { setRecentSearches(safeRecentSearches(window.localStorage.getItem(recentSearchesKey))); } catch { /* Search works without local storage. */ }
  }, []);

  useEffect(() => {
    if (!canSuggest) {
      requestRef.current?.abort();
      setItems([]);
      setLoading(false);
      setError('');
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
        const response = await fetch(`/api/site-search?q=${encodeURIComponent(normalizedQuery)}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({})) as SearchResponse;
        if (!response.ok) throw new Error(data.error || 'تعذر البحث الآن.');
        setItems(Array.isArray(data.items) ? data.items.slice(0, 6) : []);
        setActiveIndex(-1);
      } catch (searchError) {
        if ((searchError as Error)?.name === 'AbortError') return;
        setItems([]);
        setError(searchError instanceof Error ? searchError.message : 'تعذر البحث الآن.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => { window.clearTimeout(timer); requestRef.current?.abort(); };
  }, [canSuggest, normalizedQuery]);

  function rememberSearch(nextQuery: string, nextVillage: string) {
    const cleanQuery = nextQuery.trim().slice(0, 100);
    if (!cleanQuery) return;

    const next = [
      { query: cleanQuery, village: nextVillage || 'all' },
      ...recentSearches.filter((item) => item.query !== cleanQuery || item.village !== nextVillage),
    ].slice(0, 3);
    setRecentSearches(next);
    try {
      window.localStorage.setItem(recentSearchesKey, JSON.stringify(next));
    } catch {
      // Browsing can continue when storage is unavailable or blocked.
    }
  }

  function villageLabel(value: string) {
    return value === 'all' ? 'كل العسيرات' : value;
  }

  function openItem(item: SearchItem) {
    if (!item.href.startsWith('/')) return;
    rememberSearch(item.title, village);
    setFocused(false);
    router.push(item.href);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!normalizedQuery) {
      event.preventDefault();
      return;
    }
    rememberSearch(normalizedQuery, village);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setFocused(false);
      setActiveIndex(-1);
      return;
    }
    if (!panelOpen || !items.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => current >= items.length - 1 ? 0 : current + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => current <= 0 ? items.length - 1 : current - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
      event.preventDefault();
      openItem(items[activeIndex]);
    }
  }

  function chooseShortcut(nextQuery: string, nextVillage = village) {
    setQuery(nextQuery);
    setVillage(nextVillage);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <section className={`smart-compass smart-compass--${variant}`} aria-label="بوصلة البحث المحلي" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div className="smart-compass__heading">
        <div className="smart-compass__seal" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1.2" /><path d="M24 3v6m0 30v6M3 24h6m30 0h6" stroke="currentColor" strokeWidth="1.5" /><g className="smart-compass__needle"><path d="m31 13-4 14-14 8 8-14Z" fill="#b88b33" /><path d="m31 13-10 8 6 6Z" fill="#174837" /></g><circle cx="24" cy="24" r="2.4" fill="#fffdf5" stroke="#174837" /></svg>
        </div>
        <div>
          <span>بوصلة العسيرات الذكية</span>
          <strong>احتياجك فين؟ خلّينا ندلّك.</strong>
        </div>
        <small>بحث محلي</small>
      </div>

      <form className="smart-compass__form" action="/directory" method="get" role="search" onSubmit={handleSubmit}>
        <div className="smart-compass__field smart-compass__query">
          <label htmlFor={`${listId}-query`}>الخدمة أو المكان</label>
          <div className="smart-compass__input-row">
            <svg className="smart-compass__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" strokeLinecap="round" /></svg>
            <input
              ref={inputRef}
              id={`${listId}-query`}
              name="q"
              value={query}
              onChange={(event) => { setQuery(event.target.value.slice(0, 100)); setActiveIndex(-1); }}
              onFocus={() => setFocused(true)}
              onKeyDown={handleInputKeyDown}
              placeholder="مثال: دكتور أسنان، صيدلية، نجار…"
              autoComplete="off"
              inputMode="search"
              enterKeyHint="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={panelOpen}
              aria-controls={`${listId}-options`}
              aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            />
            {query && <button className="smart-compass__clear" type="button" aria-label="مسح البحث" onClick={() => { setQuery(''); inputRef.current?.focus(); }}><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m6 6 8 8M6 14l8-8" /></svg></button>}
          </div>

          {panelOpen && (
            <div className="smart-compass__suggestions">
              <div className="smart-compass__suggestions-status" aria-live="polite">
                {loading ? 'بنفتش في الدليل…' : error || (items.length ? 'نتائج سريعة من الدليل' : 'مفيش نتيجة مباشرة؛ جرّب البحث الكامل')}
              </div>
              <div id={`${listId}-options`} role="listbox" aria-label="اقتراحات البحث">
                {!loading && items.map((item, index) => (
                  <button
                    key={`${item.kind}-${item.href}`}
                    id={`${listId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === index}
                    className={activeIndex === index ? 'is-active' : undefined}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => openItem(item)}
                  >
                    <span className={`smart-compass__result-icon kind-${item.kind}`} aria-hidden="true">{glyphForKind(item.kind)}</span>
                    <span><strong>{item.title}</strong><small>{item.subtitle}</small></span>
                    <i>{item.badge}</i>
                  </button>
                ))}
              </div>
              {!loading && (
                <Link prefetch={false} href={`/directory?q=${encodeURIComponent(normalizedQuery)}${village !== 'all' ? `&village=${encodeURIComponent(village)}` : ''}`}>
                  عرض كل النتائج لـ «{normalizedQuery}» <b aria-hidden="true">←</b>
                </Link>
              )}
            </div>
          )}
        </div>

        <label className="smart-compass__field smart-compass__village" htmlFor={`${listId}-village`}>
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.4" /></svg>نطاق البحث</span>
          <select id={`${listId}-village`} name="village" value={village} onChange={(event) => setVillage(event.target.value)}>
            <option value="all">كل العسيرات</option>
            {villages.map((item) => <option key={item.slug} value={item.name}>{item.name}</option>)}
          </select>
        </label>

        <button className="smart-compass__submit" type="submit" disabled={!normalizedQuery}>
          <span>دوّر الآن</span>
          <b aria-hidden="true">←</b>
        </button>
      </form>

      <div className="smart-compass__shortcuts">
        <span>تبدأ بإيه؟</span>
        <div>
          {popularNeeds.map((need) => (
            <button key={need} type="button" onClick={() => chooseShortcut(need)}>{need}</button>
          ))}
        </div>
      </div>

        <details className="smart-compass__recent" aria-label="آخر عمليات البحث على هذا الجهاز">
          <summary><span>آخر بحث عندك</span><span aria-hidden="true">⌄</span></summary>
          <div>
            {recentSearches.length === 0 && <p>بحثك الأخير هيظهر هنا، على جهازك بس.</p>}
            {recentSearches.map((item) => (
              <button
                key={`${item.query}-${item.village}`}
                type="button"
                onClick={() => chooseShortcut(item.query, item.village)}
              >
                <strong>{item.query}</strong>
                <small>{villageLabel(item.village)}</small>
              </button>
            ))}
          </div>
        </details>
    </section>
  );
}
