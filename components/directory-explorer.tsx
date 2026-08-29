import Link from 'next/link';
import { categories, villages, type DirectoryCategory } from '@/lib/data';
import { createDirectoryHref, type DirectoryQueryResult } from '@/lib/directory-query';
import {
  getTransportDestinationLabel,
  getTransportVehicleLabel,
  transportDestinationFilters,
  transportVehicleFilters,
} from '@/lib/transport-filters';
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
  transportFilters,
}: {
  category?: DirectoryCategory;
  query?: string;
  village?: string;
  result: DirectoryQueryResult;
  pathname: string;
  transportFilters?: { vehicle?: string; destination?: string };
}) {
  const pages = pageNumbers(result.page, result.totalPages);
  const vehicle = transportFilters?.vehicle || 'all';
  const destination = transportFilters?.destination || 'all';
  const hasTransportFilter = category === 'transport' && (vehicle !== 'all' || destination !== 'all');

  return (
    <div className="explorer explorer--premium">
      {category === 'transport' && (
        <div className="explorer__toolbar-shell">
          <div className="explorer__toolbar-heading">
            <div>
              <span className="explorer__toolbar-kicker">دليل سواقين العسيرات</span>
              <strong>فلتر سريع حسب نوع المركبة والوجهة</strong>
            </div>
            <span className="explorer__toolbar-mark" aria-hidden="true"><BrandMark compact /></span>
          </div>

          <div className="detail-actions" aria-label="تصفية حسب نوع المركبة">
            {transportVehicleFilters.map((item) => (
              <Link
                key={item.value}
                className={`button ${vehicle === item.value ? 'button--primary' : 'button--ghost'}`}
                href={createDirectoryHref(pathname, {
                  query,
                  village,
                  vehicle: item.value,
                  destination,
                })}
                aria-current={vehicle === item.value ? 'true' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="detail-actions" aria-label="تصفية حسب الوجهة">
            {transportDestinationFilters.map((item) => (
              <Link
                key={item.value}
                className={`button ${destination === item.value ? 'button--primary' : 'button--soft'}`}
                href={createDirectoryHref(pathname, {
                  query,
                  village,
                  vehicle,
                  destination: item.value,
                })}
                aria-current={destination === item.value ? 'true' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="explorer__toolbar-shell">
        <div className="explorer__toolbar-heading">
          <div>
            <span className="explorer__toolbar-kicker">بحث وتصفية</span>
            <strong>وصّل للنتيجة الأقرب لاحتياجك</strong>
          </div>
          <span className="explorer__toolbar-mark" aria-hidden="true"><BrandMark compact /></span>
        </div>

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
            {(query || village !== 'all' || hasTransportFilter) && <Link href={pathname} className="button button--ghost">مسح</Link>}
          </div>

          <label className="select-field">
            <span className="select-field__brand" aria-hidden="true"><BrandMark compact /></span>
            <span>القرية</span>
            <select name="village" defaultValue={village}>
              <option value="all">كل نطاق العسيرات</option>
              {villages.map((item) => <option key={item.slug} value={item.name}>{item.name}</option>)}
            </select>
          </label>

          {category === 'transport' && vehicle !== 'all' && <input type="hidden" name="vehicle" value={vehicle} />}
          {category === 'transport' && destination !== 'all' && <input type="hidden" name="destination" value={destination} />}
        </form>
      </div>

      {!category && (
        <div className="category-pills category-pills--premium" aria-label="فئات الدليل">
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

      <div className="results-bar results-bar--premium">
        <div className="results-bar__identity">
          <span className="results-bar__mark" aria-hidden="true"><BrandMark compact /></span>
          <div><strong>{result.total.toLocaleString('ar-EG')}</strong><span>نتيجة مطابقة</span></div>
        </div>
        <div className="results-bar__context">
          {query && <span>بحث: <b>«{query}»</b></span>}
          {village !== 'all' && <span>النطاق: <b>{village}</b></span>}
          {category === 'transport' && vehicle !== 'all' && <span>المركبة: <b>{getTransportVehicleLabel(vehicle)}</b></span>}
          {category === 'transport' && destination !== 'all' && <span>الوجهة: <b>{getTransportDestinationLabel(destination)}</b></span>}
          {result.total > result.pageSize && <span>عرض {result.from.toLocaleString('ar-EG')}–{result.to.toLocaleString('ar-EG')}</span>}
        </div>
      </div>

      {result.items.length ? (
        <>
          <div className="listing-grid">
            {result.items.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
          </div>

          {result.totalPages > 1 && (
            <nav className="detail-actions detail-actions--pagination" aria-label="صفحات نتائج الدليل">
              {result.page > 1 && (
                <Link
                  className="button button--ghost"
                  href={createDirectoryHref(pathname, {
                    query,
                    village,
                    vehicle,
                    destination,
                    page: result.page - 1,
                  })}
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
                    {showGap && <span className="pagination-gap" aria-hidden="true">…</span>}
                    <Link
                      className={`button ${page === result.page ? 'button--primary' : 'button--soft'}`}
                      href={createDirectoryHref(pathname, { query, village, vehicle, destination, page })}
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
                  href={createDirectoryHref(pathname, {
                    query,
                    village,
                    vehicle,
                    destination,
                    page: result.page + 1,
                  })}
                  rel="next"
                >
                  التالي
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <div className="empty-state empty-state--premium">
          <span className="empty-state__mark" aria-hidden="true"><BrandMark /></span>
          <strong>لا توجد نتائج مطابقة</strong>
          <p>جرّب نوع مركبة أو وجهة أخرى، كلمة أقصر، أو اختر قرية مختلفة.</p>
          <Link href={pathname} className="button button--soft">عرض كل النتائج</Link>
        </div>
      )}
    </div>
  );
}
