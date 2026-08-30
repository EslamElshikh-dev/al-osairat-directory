'use client';

import { useEffect } from 'react';

export function NewsRefreshPulse() {
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/news/refresh', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      signal: controller.signal,
    }).catch(() => undefined);

    return () => controller.abort();
  }, []);

  return null;
}
