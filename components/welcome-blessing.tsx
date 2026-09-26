'use client';

import { useEffect, useState } from 'react';

const KEY = 'osairat:welcome-blessing:v1';

export function WelcomeBlessing() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(KEY)) {
        window.localStorage.setItem(KEY, 'seen');
        const timeout = window.setTimeout(() => setVisible(true), 1500);
        return () => window.clearTimeout(timeout);
      }
    } catch { /* Private browsing may disallow storage. */ }
  }, []);
  if (!visible) return null;

  return <aside className="welcome-blessing" aria-label="رسالة ترحيب" role="status">
    <span className="welcome-blessing__mark" aria-hidden="true">✦</span>
    <div><strong>يا مرحب بأهل العسيرات</strong><p>اللهم صل وسلم وزد وبارك على سيدنا محمد</p></div>
    <button type="button" onClick={() => setVisible(false)} aria-label="إغلاق رسالة الترحيب">×</button>
  </aside>;
}
