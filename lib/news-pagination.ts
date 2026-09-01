export const NEWS_PAGE_SIZE = 16;

export type NewsPagination<T> = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startItem: number;
  endItem: number;
  pageItems: T[];
};

export function paginateNews<T>(items: T[], requestedPage: number): NewsPagination<T> {
  if (!Number.isSafeInteger(requestedPage) || requestedPage < 1) {
    throw new RangeError('News page must be a positive integer.');
  }

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / NEWS_PAGE_SIZE));

  if (requestedPage > totalPages) {
    throw new RangeError('News page is outside the available range.');
  }

  const startIndex = (requestedPage - 1) * NEWS_PAGE_SIZE;
  const pageItems = items.slice(startIndex, startIndex + NEWS_PAGE_SIZE);

  return {
    currentPage: requestedPage,
    totalPages,
    totalItems,
    startItem: totalItems === 0 ? 0 : startIndex + 1,
    endItem: startIndex + pageItems.length,
    pageItems,
  };
}

export function newsPageHref(page: number) {
  return page === 1 ? '/news#latest-news' : `/news/page/${page}#latest-news`;
}
