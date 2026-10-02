'use client';

import { useEffect, useState } from 'react';

const KEY = 'osairat:welcome-blessing:v1';

export function WelcomeBlessing() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY)) return;
    } catch { /* Private browsing may disallow storage. */ }
    const timeout = window.setTimeout(() => {
      setVisible(true);
      // Mark only after actually showing it: effect cleanup must not consume the first visit.
      try { window.localStorage.setItem(KEY, 'seen'); } catch {}
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, []);
  useEffect(() => {
    if (!visible) return;
    const dismiss = () => setVisible(false);
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    const timeout = window.setTimeout(dismiss, 15_000);
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [visible]);
  if (!visible) return null;

  return <aside className="welcome-blessing" aria-label="رسالة ترحيب" role="status">
    <div><strong>نورت الدليل 🤍</strong><p>اللهم صل وسلم وزد وبارك على سيدنا محمد.</p></div>
    <button type="button" onClick={() => setVisible(false)} aria-label="إغلاق رسالة الترحيب">×</button>
  </aside>;
}
