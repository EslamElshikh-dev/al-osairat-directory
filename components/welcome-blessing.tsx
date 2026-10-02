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
  if (!visible) return null;

  return <aside className="welcome-blessing" aria-label="رسالة ترحيب" role="status">
    <span className="welcome-blessing__mark" aria-hidden="true">✦</span>
    <div><strong>نورت الدليل 🤍</strong><p>اللهم صل وسلم وزد وبارك على سيدنا محمد، نورت الدليل 🤍.</p></div>
    <button type="button" onClick={() => setVisible(false)} aria-label="إغلاق رسالة الترحيب">×</button>
  </aside>;
}
