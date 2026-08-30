'use client';

import { useEffect } from 'react';
import { initializeAnalyticsQueue, loadGoogleAnalytics } from '@/lib/analytics';

const POST_LOAD_DELAY_MS = 8000;
const HARD_FALLBACK_MS = 15000;

export function GoogleAnalyticsLoader() {
  useEffect(() => {
    // Queue config/events immediately, but keep the 175 KiB Google tag off the first-paint path.
    initializeAnalyticsQueue();

    let postLoadTimer: number | null = null;
    let hardFallbackTimer: number | null = null;
    let started = false;

    const interactionEvents: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'touchstart',
      'scroll',
    ];

    const removeInteractionListeners = () => {
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, startNow);
      });
    };

    const clearScheduledWork = () => {
      if (postLoadTimer !== null) {
        window.clearTimeout(postLoadTimer);
        postLoadTimer = null;
      }
      if (hardFallbackTimer !== null) {
        window.clearTimeout(hardFallbackTimer);
        hardFallbackTimer = null;
      }
    };

    function startNow() {
      if (started) return;
      started = true;
      clearScheduledWork();
      removeInteractionListeners();
      window.removeEventListener('load', scheduleAfterLoad);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', startNow);
      void loadGoogleAnalytics();
    }

    function scheduleAfterLoad() {
      if (started || postLoadTimer !== null) return;
      postLoadTimer = window.setTimeout(startNow, POST_LOAD_DELAY_MS);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') startNow();
    }

    // A real user action wins over the delay so clicks/conversions do not wait for GA4.
    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, startNow, {
        once: true,
        passive: eventName !== 'keydown',
      });
    });

    // Best effort for short visits: begin loading before the document is backgrounded/left.
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', startNow, { once: true });

    if (document.readyState === 'complete') {
      scheduleAfterLoad();
    } else {
      window.addEventListener('load', scheduleAfterLoad, { once: true });
    }

    // Safety cap: measurement is deferred, never silently abandoned on unusual load lifecycles.
    hardFallbackTimer = window.setTimeout(startNow, HARD_FALLBACK_MS);

    return () => {
      clearScheduledWork();
      removeInteractionListeners();
      window.removeEventListener('load', scheduleAfterLoad);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', startNow);
    };
  }, []);

  return null;
}
