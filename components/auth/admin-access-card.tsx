'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function AdminAccessCard() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetch('/api/admin/access', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return false;
        const payload = await response.json().catch(() => null);
        return payload?.isAdmin === true;
      })
      .then((authorized) => { if (active) setIsAdmin(authorized); })
      .catch(() => { if (active) setIsAdmin(false); });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <section className="admin-access-card is-visible">
      <div className="admin-access-card__copy">
        <span>إدارة الدليل</span>
        <strong>لوحة إدارة دليل العسيرات</strong>
        <p>راجع طلبات الأنشطة ومطالبات الملكية واتخذ قرارات المراجعة.</p>
      </div>
      <Link href="/admin">فتح لوحة الإدارة ←</Link>
    </section>
  );
}
