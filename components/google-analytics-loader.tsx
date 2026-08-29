'use client';

import { useEffect } from 'react';
import { initializeAnalyticsQueue, loadGoogleAnalytics } from '@/lib/analytics';

type IdleCapableWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function GoogleAnalyticsLoader() {
  useEffect(() => {
    initializeAnalyticsQueue();

    const idleWindow = window as IdleCapableWindow;
    let idleHandle: number | null = null;
    let idleFallbackTimer: number | null = null;
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
      if (idleHandle !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleHandle);
        idleHandle = null;
      }
      if (idleFallbackTimer !== null) {
        window.clearTimeout(idleFallbackTimer);
        idleFallbackTimer = null;
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
      void loadGoogleAnalytics();
    }

    function scheduleAfterLoad() {
      if (started) return;

      if (idleWindow.requestIdleCallback) {
        idleHandle = idleWindow.requestIdleCallback(startNow, { timeout: 1200 });
      } else {
        idleFallbackTimer = window.setTimeout(startNow, 650);
      }
    }

    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, startNow, {
        once: true,
        passive: eventName !== 'keydown',
      });
    });

    if (document.readyState === 'complete') {
      scheduleAfterLoad();
    } else {
      window.addEventListener('load', scheduleAfterLoad, { once: true });
    }

    // Hard cap for very slow pages so measurement is deferred, not abandoned.
    hardFallbackTimer = window.setTimeout(startNow, 5000);

    return () => {
      clearScheduledWork();
      removeInteractionListeners();
      window.removeEventListener('load', scheduleAfterLoad);
    };
  }, []);

  return null;
}
