'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AdminDataSync({ expectedCount }: { expectedCount: number }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function sync() {
    if (state === 'loading') return;
    setState('loading');
    setMessage('جاري بناء النسخة المركزية من بيانات الدليل…');

    try {
      const response = await fetch('/api/admin/directory-sync', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      const payload = await response.json().catch(() => ({})) as {
        error?: string;
        synced?: number;
        activeEntities?: number;
      };

      if (!response.ok) throw new Error(payload.error || 'تعذر إتمام المزامنة.');

      const active = Number(payload.activeEntities || payload.synced || expectedCount);
      setState('success');
      setMessage(`تمت مزامنة ${active.toLocaleString('ar-EG')} سجلًا في طبقة البيانات المركزية.`);
      router.refresh();
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'تعذر إتمام المزامنة.');
    }
  }

  return (
    <div className="admin-data-sync" aria-live="polite">
      <button type="button" className="button button--primary" onClick={sync} disabled={state === 'loading'}>
        {state === 'loading' ? 'جاري المزامنة…' : 'مزامنة قاعدة بيانات الدليل'}
      </button>
      <small>
        {message || `ينقل ${expectedCount.toLocaleString('ar-EG')} سجلًا حاليًا إلى طبقة البحث المركزية مع الاحتفاظ بالمصدر وحالة التحقق.`}
      </small>
    </div>
  );
}
