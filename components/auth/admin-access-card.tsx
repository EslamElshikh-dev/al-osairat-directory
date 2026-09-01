'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './admin-access-card.module.css';

export function AdminAccessCard() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

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
      .then(setVisible)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setVisible(false);
      });

    return () => controller.abort();
  }, []);

  // Keep administration copy out of ordinary members' initial HTML entirely.
  if (!visible) return null;

  return (
    <section className={styles.card} aria-label="الوصول الإداري">
      <div className={styles.icon} aria-hidden="true">✓</div>
      <div className={styles.copy}>
        <span>حساب الإدارة المعتمد</span>
        <strong>لوحة إدارة دليل العسيرات</strong>
        <p>الإحصاءات، جودة البيانات، طلبات الأعضاء والبلاغات في مركز تشغيل واحد.</p>
      </div>
      <Link className={styles.action} href="/admin">فتح لوحة الإدارة <b aria-hidden="true">←</b></Link>
    </section>
  );
}
