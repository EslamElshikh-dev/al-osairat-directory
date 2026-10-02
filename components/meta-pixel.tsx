'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

const PIXEL_ID = '28666614406293709';

type PixelWindow = Window & {
  fbq?: (...args: string[]) => void;
};

export function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const previousUrl = useRef<string | null>(null);

  const trackPageView = useCallback(() => {
    const fbq = (window as PixelWindow).fbq;
    const url = window.location.pathname + window.location.search;
    if (!fbq || previousUrl.current === url) return;

    fbq('trackSingle', PIXEL_ID, 'PageView');
    previousUrl.current = url;
  }, []);

  useEffect(() => {
    trackPageView();
  }, [pathname, query, trackPageView]);

  return (
    <Script id="usayrat-meta-pixel" strategy="afterInteractive" onReady={trackPageView}>
      {`
        !function(f,b,e,v,n,t,s){
          if(f.fbq)return;
          n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
          // Next.js route effects own PageView tracking, including browser back/forward.
          n.disablePushState=!0;
          t=b.createElement(e);t.async=!0;t.src=v;
          s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);
        }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
        if(!window.__usayratMetaPixelInitialized){
          fbq.disablePushState=true;
          fbq('init','${PIXEL_ID}');
          window.__usayratMetaPixelInitialized=true;
        }
      `}
    </Script>
  );
}

export function MetaPixelNoScript() {
  return (
    <noscript>
      {/* A native image is required for Meta's JavaScript-disabled tracking endpoint. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height="1"
        width="1"
        style={{ display: 'none' }}
        alt=""
        src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
      />
    </noscript>
  );
}
