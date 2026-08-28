'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { categories, listings, villages, type DirectoryCategory } from '@/lib/data';
import { normalizeArabic } from '@/lib/site';
import { ListingCard } from './listing-card';
import { BrandMark } from './site-shell';

export function DirectoryExplorer({
  category,
  initialQuery = '',
}: {
  category?: DirectoryCategory;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [village, setVillage] = useState('all');

  const results = useMemo(() => {
    const q = normalizeArabic(query);
    return listings.filter((listing) => {
      if (category && listing.category !== category) return false;
      if (village !== 'all' && listing.village !== village) return false;
      if (!q) return true;
      const haystack = normalizeArabic(
        [listing.title, listing.subCategory, listing.location, listing.village, listing.description]
          .filter(Boolean)
          .join(' '),
      );
      return haystack.includes(q);
    });
  }, [category, query, village]);

  return (
    <div className="explorer">
      <div className="explorer__tools">
        <label className="search-field">
          <span className="search-field__brand" aria-hidden="true">
            <BrandMark compact />
          </span>
          <span className="sr-only">ابحث في الدليل</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث باسم النشاط، التخصص، الخدمة أو القرية..."
            inputMode="search"
            autoComplete="off"
          />
          <span className="search-field__hint">بحث ذكي</span>
        </label>
        <label className="select-field">
          <span>القرية</span>
          <select value={village} onChange={(event) => setVillage(event.target.value)}>
            <option value="all">كل نطاق العسيرات</option>
            {villages.map((item) => (
              <option key={item.slug} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!category && (
        <div className="category-pills" aria-label="فئات الدليل">
          {categories.map((item) => (
            <Link key={item.id} href={`/directory/${item.id}`} className={`category-pill category-pill--${item.id}`}>
              <span className="category-pill__mark" aria-hidden="true">
                <BrandMark compact />
              </span>
              <span>{item.shortLabel}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="results-bar">
        <strong>{results.length.toLocaleString('ar-EG')}</strong>
        <span>نتيجة مطابقة</span>
      </div>

      {results.length ? (
        <div className="listing-grid">
          {results.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>لا توجد نتائج مطابقة</strong>
          <p>جرّب كلمة أقصر أو اختر قرية أخرى.</p>
        </div>
      )}
    </div>
  );
}
