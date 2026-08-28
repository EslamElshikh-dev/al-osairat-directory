import Link from 'next/link';
import { categories, villages, type DirectoryCategory } from '@/lib/data';
import { createDirectoryHref, type DirectoryQueryResult } from '@/lib/directory-query';
import { ListingCard } from './listing-card';
import { BrandMark } from './site-shell';
import { CategoryVisual } from './category-visual';

function pageNumbers(current: number, total: number) {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  const values = new Set([1, total, current - 1, current, current + 1]);
  return Array.from(values)
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
}

export function DirectoryExplorer({
  category,
  query = '',
  village = 'all',
  result,
  pathname,
}: {
  category?: DirectoryCategory;
  query?: string;
  village?: string;
  result: DirectoryQueryResult;
  pathname: string;
}) {
  const pages = pageNumbers(result.page, result.totalPages);

  return (
    <div className="explorer">
      <form className="explorer__tools" action={pathname} method="get" role="search">
        <div className="search-field">
          <span className="search-field__brand" aria-hidden="true"><BrandMark compact /></span>
          <label className="sr-only" htmlFor="directory-search">ابحث في الدليل</label>
          <input
            id="directory-search"
            name="q"
            defaultValue={query}
            placeholder="ابحث باسم النشاط، التخصص، الخدمة أو القرية..."
            inputMode="search"
            autoComplete="off"
          />
          <span className="search-field__hint">بحث ذكي</span>
          <button type="submit" className="button button--primary">بحث</button>
          {(query || village !== 'all') && <Link href={pathname} className="button button--ghost">مسح</Link>}
        </div>

        <label className="select-field">
          <span className="select-field__brand" aria-hidden="true"><BrandMark compact /></span>
          <span>القرية</span>
          <select name="village" defaultValue={village}>
            <option value="all">كل نطاق العسيرات</option>
            {villages.map((item) => <option key={item.slug} value={item.name}>{item.name}</option>)}
          </select>
        </label>
      </form>

      {!category && (
        <div className="category-pills" aria-label="فئات الدليل">
          {categories.map((item) => (
            <Link
              key={item.id}
              href={createDirectoryHref(`/directory/${item.id}`, { query, village })}
              className={`category-pill category-pill--${item.id}`}
            >
              <CategoryVisual category={item.id} size="sm" />
              <span>{item.shortLabel}</span>
              <span className="category-pill__brand" aria-hidden="true"><BrandMark compact /></span>
            </Link>
          ))}
        </div>
      )}

      <div className="results-bar">
        <strong>{result.total.toLocaleString('ar-EG')}</strong>
        <span>نتيجة مطابقة</span>
        {result.total > result.pageSize && (
          <span>عرض {result.from.toLocaleString('ar-EG')}–{result.to.toLocaleString('ar-EG')}</span>
        )}
      </div>

      {result.items.length ? (
        <>
          <div className="listing-grid">
            {result.items.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
          </div>

          {result.totalPages > 1 && (
            <nav className="detail-actions" aria-label="صفحات نتائج الدليل">
              {result.page > 1 && (
                <Link
                  className="button button--ghost"
                  href={createDirectoryHref(pathname, { query, village, page: result.page - 1 })}
                  rel="prev"
                >
                  السابق
                </Link>
              )}

              {pages.map((page, index) => {
                const previous = pages[index - 1];
                const showGap = previous && page - previous > 1;
                return (
                  <span key={page} style={{ display: 'contents' }}>
                    {showGap && <span aria-hidden="true">…</span>}
                    <Link
                      className={`button ${page === result.page ? 'button--primary' : 'button--soft'}`}
                      href={createDirectoryHref(pathname, { query, village, page })}
                      aria-current={page === result.page ? 'page' : undefined}
                    >
                      {page.toLocaleString('ar-EG')}
                    </Link>
                  </span>
                );
              })}

              {result.page < result.totalPages && (
                <Link
                  className="button button--ghost"
                  href={createDirectoryHref(pathname, { query, village, page: result.page + 1 })}
                  rel="next"
                >
                  التالي
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <div className="empty-state">
          <strong>لا توجد نتائج مطابقة</strong>
          <p>جرّب كلمة أقصر، مرادفًا آخر، أو اختر قرية أخرى.</p>
        </div>
      )}
    </div>
  );
}
