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
    setRecentSearches(safeRecentSearches(window.localStorage.getItem(recentSearchesKey)));
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

    return () => window.clearTimeout(timer);
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
    if (activeIndex >= 0 && items[activeIndex]) {
      event.preventDefault();
      openItem(items[activeIndex]);
      return;
    }
    rememberSearch(normalizedQuery, village);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!panelOpen || !items.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => current >= items.length - 1 ? 0 : current + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => current <= 0 ? items.length - 1 : current - 1);
    } else if (event.key === 'Escape') {
      setFocused(false);
      setActiveIndex(-1);
    }
  }

  function chooseShortcut(nextQuery: string, nextVillage = village) {
    setQuery(nextQuery);
    setVillage(nextVillage);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <section className={`smart-compass smart-compass--${variant}`} aria-label="بوصلة البحث المحلي">
      <div className="smart-compass__heading">
        <div className="smart-compass__seal" aria-hidden="true"><i /><b /></div>
        <div>
          <span>بوصلة العسيرات الذكية</span>
          <strong>قول بتدور على إيه… وحدد قريتك</strong>
        </div>
        <small><b>خطوتان</b> للوصول</small>
      </div>

      <form className="smart-compass__form" action="/directory" method="get" role="search" onSubmit={handleSubmit}>
        <div className="smart-compass__field smart-compass__query">
          <label htmlFor={`${listId}-query`}>الخدمة أو المكان</label>
          <div className="smart-compass__input-row">
            <span aria-hidden="true">⌕</span>
            <input
              ref={inputRef}
              id={`${listId}-query`}
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value.slice(0, 100))}
              onFocus={() => setFocused(true)}
              onBlur={() => window.setTimeout(() => setFocused(false), 140)}
              onKeyDown={handleInputKeyDown}
              placeholder="مثال: دكتور أسنان، صيدلية، نجار…"
              autoComplete="off"
              inputMode="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={panelOpen}
              aria-controls={`${listId}-options`}
              aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            />
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
                <Link href={`/directory?q=${encodeURIComponent(normalizedQuery)}${village !== 'all' ? `&village=${encodeURIComponent(village)}` : ''}`}>
                  عرض كل النتائج لـ «{normalizedQuery}» <b aria-hidden="true">←</b>
                </Link>
              )}
            </div>
          )}
        </div>

        <label className="smart-compass__field smart-compass__village" htmlFor={`${listId}-village`}>
          <span>نطاق البحث</span>
          <select id={`${listId}-village`} name="village" value={village} onChange={(event) => setVillage(event.target.value)}>
            <option value="all">كل مركز العسيرات</option>
            {villages.map((item) => <option key={item.slug} value={item.name}>{item.name}</option>)}
          </select>
        </label>

        <button className="smart-compass__submit" type="submit" disabled={!normalizedQuery}>
          <span>دلّني الآن</span>
          <b aria-hidden="true">←</b>
        </button>
      </form>

      <div className="smart-compass__shortcuts">
        <span>طلبات شائعة</span>
        <div>
          {popularNeeds.map((need) => (
            <button key={need} type="button" onClick={() => chooseShortcut(need)}>{need}</button>
          ))}
        </div>
      </div>

      {recentSearches.length > 0 && (
        <div className="smart-compass__recent" aria-label="آخر عمليات البحث على هذا الجهاز">
          <span>آخر بحث عندك</span>
          <div>
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
        </div>
      )}
    </section>
  );
}
