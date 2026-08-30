'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function resetToTop() {
  if (window.location.hash) return;
  window.scrollTo(0, 0);
}

export function NavigationScrollManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const frame = window.requestAnimationFrame(resetToTop);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, search]);

  useEffect(() => {
    const handlePageShow = () => resetToTop();
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  return null;
}
