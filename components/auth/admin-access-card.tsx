'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function AdminAccessCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/access', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => { if (active) setVisible(response.ok); })
      .catch(() => { if (active) setVisible(false); });
    return () => { active = false; };
  }, []);

  return (
    <section className={`admin-access-card${visible ? ' is-visible' : ''}`} aria-hidden={!visible}>
      <div className="admin-access-card__copy">
        <span>صلاحية خاصة</span>
        <strong>لوحة إدارة دليل العسيرات</strong>
        <p>راجع طلبات الأنشطة ومطالبات الملكية واتخذ قرارات المراجعة.</p>
      </div>
      {visible && <Link href="/admin">فتح لوحة الإدارة ←</Link>}
    </section>
  );
}
