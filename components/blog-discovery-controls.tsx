'use client';

import { useEffect, useRef, useState } from 'react';
import {
  blogDiscoveryTopics,
  normalizeBlogSearchText,
  type BlogDiscoveryTopic,
} from '@/lib/blog-discovery';

export function BlogDiscoveryControls({ total }: { total: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<BlogDiscoveryTopic>('all');
  const [visibleCount, setVisibleCount] = useState(total);

  useEffect(() => {
    const normalizedQuery = normalizeBlogSearchText(query);
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>('[data-blog-discovery-card]'),
    );

    let count = 0;
    for (const card of cards) {
      const cardTopic = card.dataset.blogTopic || '';
      const cardSearch = card.dataset.blogSearch || '';
      const matchesTopic = topic === 'all' || cardTopic === topic;
      const matchesSearch = !normalizedQuery || cardSearch.includes(normalizedQuery);
      const visible = matchesTopic && matchesSearch;
      card.hidden = !visible;
      if (visible) count += 1;
    }

    setVisibleCount(count);
  }, [query, topic]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT'
        || target?.tagName === 'TEXTAREA'
        || target?.isContentEditable;

      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if (event.key === 'Escape' && document.activeElement === inputRef.current) {
        setQuery('');
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const reset = () => {
    setQuery('');
    setTopic('all');
    inputRef.current?.focus();
  };

  return (
    <div className="blog-discovery-controls">
      <div className="blog-discovery-search">
        <label htmlFor="blog-search">ابحث داخل المقالات</label>
        <div>
          <input
            ref={inputRef}
            id="blog-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="مثال: السكان، القطار، العائلات، أصل الاسم…"
            autoComplete="off"
          />
          <kbd aria-hidden="true">/</kbd>
        </div>
      </div>

      <div className="blog-discovery-topics" role="group" aria-label="تصفية المقالات حسب الموضوع">
        {blogDiscoveryTopics.map((item) => (
          <button
            key={item.value}
            type="button"
            className={topic === item.value ? 'is-active' : undefined}
            aria-pressed={topic === item.value}
            title={item.hint}
            onClick={() => setTopic(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="blog-discovery-status">
        <span aria-live="polite">
          ظاهر {visibleCount.toLocaleString('ar-EG')} من {total.toLocaleString('ar-EG')} مقالات
        </span>
        {(query || topic !== 'all') ? (
          <button type="button" onClick={reset}>مسح البحث والتصفية</button>
        ) : null}
      </div>

      {visibleCount === 0 ? (
        <div className="blog-discovery-empty">
          <strong>مفيش مقال مطابق للكلمة دي حاليًا.</strong>
          <p>جرّب كلمة أقصر أو امسح التصفية. ولو الموضوع مهم فعلًا للعسيرات، فدي إشارة كويسة لمقال جديد بدل ما نزوّق نتيجة مش موجودة.</p>
          <button type="button" onClick={reset}>عرض كل المقالات</button>
        </div>
      ) : null}
    </div>
  );
}
