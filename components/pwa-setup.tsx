'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './pwa-install-banner.module.css';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let pendingInstallPrompt: InstallPromptEvent | null = null;
let wasInstalled = false;
let bannerDismissedThisSession = false;
const promptChanged = 'osairat:install-prompt-changed';
const bannerDismissedKey = 'osairat_pwa_install_dismissed_until';
const installedKey = 'osairat_pwa_installed';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isAppleMobile() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function dismissBanner(days: number) {
  bannerDismissedThisSession = true;
  try { localStorage.setItem(bannerDismissedKey, String(Date.now() + days * 24 * 60 * 60 * 1000)); } catch { /* Session dismissal still works. */ }
}

async function requestInstall() {
  const prompt = pendingInstallPrompt;
  if (!prompt) return;
  pendingInstallPrompt = null;
  window.dispatchEvent(new Event(promptChanged));
  try {
    await prompt.prompt();
    await prompt.userChoice;
  } catch {
    // The manual steps remain available if the browser does not show its prompt.
  }
}

export function PwaSetup() {
  useEffect(() => {
    function onInstallPrompt(event: Event) {
      event.preventDefault();
      pendingInstallPrompt = event as InstallPromptEvent;
      window.dispatchEvent(new Event(promptChanged));
    }

    function onInstalled() {
      pendingInstallPrompt = null;
      wasInstalled = true;
      try { localStorage.setItem(installedKey, '1'); } catch { /* The current session still knows. */ }
      window.dispatchEvent(new Event(promptChanged));
    }

    function registerWorker() {
      if ('serviceWorker' in navigator) {
        void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
          // A failed registration must not block the live directory.
        });
      }
    }

    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    if (isStandalone()) onInstalled();
    if (document.readyState === 'complete') registerWorker();
    else window.addEventListener('load', registerWorker, { once: true });

    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('load', registerWorker);
    };
  }, []);

  return null;
}

export function InstallAction() {
  const [platform, setPlatform] = useState<'manual' | 'ios' | 'prompt' | 'installed'>('manual');

  useEffect(() => {
    function update() {
      if (isStandalone() || wasInstalled) setPlatform('installed');
      else if (pendingInstallPrompt) setPlatform('prompt');
      else if (isAppleMobile()) setPlatform('ios');
      else setPlatform('manual');
    }

    update();
    window.addEventListener(promptChanged, update);
    window.addEventListener('appinstalled', update);
    return () => {
      window.removeEventListener(promptChanged, update);
      window.removeEventListener('appinstalled', update);
    };
  }, []);

  async function install() {
    await requestInstall();
  }

  if (platform === 'installed') return <Link href="/">افتح دليل العسيرات <span aria-hidden="true">←</span></Link>;
  if (platform === 'prompt') return <button type="button" onClick={install}>ثبّت التطبيق الآن <span aria-hidden="true">←</span></button>;
  return <a href={platform === 'ios' ? '#iphone' : '#android'}>شوف طريقة التثبيت <span aria-hidden="true">↓</span></a>;
}

type BannerMode = 'prompt' | 'ios' | 'android' | 'manual' | null;

export function InstallBanner({ welcomeVisible }: { welcomeVisible: boolean }) {
  const pathname = usePathname();
  const [mode, setMode] = useState<BannerMode>(null);

  useEffect(() => {
    function update() {
      let suppressed = bannerDismissedThisSession || wasInstalled || isStandalone();
      try {
        suppressed ||= localStorage.getItem(installedKey) === '1' ||
          Number(localStorage.getItem(bannerDismissedKey)) > Date.now();
      } catch { /* Keep the banner usable when storage is blocked. */ }

      if (suppressed || pathname.replace(/\/+$/, '') === '/install') setMode(null);
      else if (pendingInstallPrompt) setMode('prompt');
      else if (isAppleMobile()) setMode('ios');
      else if (/Android/.test(navigator.userAgent)) setMode('android');
      else if (window.matchMedia('(max-width: 860px)').matches) setMode('manual');
      else setMode(null);
    }

    update();
    window.addEventListener(promptChanged, update);
    window.addEventListener('appinstalled', update);
    return () => {
      window.removeEventListener(promptChanged, update);
      window.removeEventListener('appinstalled', update);
    };
  }, [pathname]);

  function hide(days: number) {
    dismissBanner(days);
    setMode(null);
  }

  function install() {
    hide(7);
    void requestInstall();
  }

  if (!mode) return null;

  return (
    <aside className={styles.banner} data-welcome={welcomeVisible} aria-label="تثبيت تطبيق دليل العسيرات">
      <Image className={styles.icon} src="/app-icons/icon-192.png" alt="" width={44} height={44} />
      <div className={styles.copy}>
        <strong>خلّي دليل العسيرات على موبايلك</strong>
        <span>{mode === 'ios' ? 'من Safari: مشاركة ← إضافة إلى الشاشة الرئيسية.' : mode === 'android' ? 'من Chrome: القائمة ⋮ ثم تثبيت التطبيق.' : mode === 'manual' ? 'خطوات التثبيت لأندرويد وآيفون في صفحة واحدة.' : 'ثبّته وافتحه من الشاشة الرئيسية بضغطة واحدة.'}</span>
      </div>
      <button type="button" className={styles.dismiss} aria-label="إغلاق تنبيه تثبيت التطبيق" onClick={() => hide(7)}>×</button>
      <div className={styles.actions}>
        {mode === 'prompt' ?
          <button type="button" className={styles.install} onClick={install}>ثبّت التطبيق</button> :
          <Link className={styles.install} href={mode === 'ios' ? '/install#iphone' : mode === 'android' ? '/install#android' : '/install/'} onClick={() => hide(1)}>طريقة التثبيت</Link>}
        <span>مجاني ومن المتصفح</span>
      </div>
    </aside>
  );
}

export function CopyInstallLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return <button type="button" onClick={copy} aria-live="polite">{copied ? 'اتنسخ الرابط ✓' : 'انسخ الرابط'}</button>;
}
