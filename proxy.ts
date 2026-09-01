import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { listings } from '@/lib/data';
import {
  getEligibleServiceIntents,
  getEligibleVillageCategoryLandings,
} from '@/lib/programmatic-seo';
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from '@/lib/auth/supabase-rest';

const allowedServiceIntents = new Set(
  getEligibleServiceIntents(listings).map(({ intent }) => intent.id),
);

const allowedVillageCategoryLandings = new Set(
  getEligibleVillageCategoryLandings(listings).map(
    ({ village, category }) => `${village.slug}/${category.id}`,
  ),
);

function decodeSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function hardNotFoundResponse() {
  return new NextResponse(
    `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, follow" />
  <title>الصفحة غير موجودة | دليل العسيرات</title>
  <style>
    :root{font-family:Arial,"Noto Sans Arabic",sans-serif;color:#16352d;background:#f4f7f5;color-scheme:light}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}
    main{width:min(620px,100%);background:#fff;border:1px solid #dbe5df;border-radius:24px;padding:44px 28px;text-align:center;box-shadow:0 18px 48px rgba(16,42,36,.08)}
    span{display:inline-block;font-size:14px;font-weight:800;letter-spacing:.08em;color:#8b6d3f;margin-bottom:10px}
    h1{font-size:clamp(28px,5vw,44px);margin:0 0 12px}p{font-size:17px;line-height:1.8;color:#587068;margin:0 auto 24px;max-width:480px}
    a{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 22px;border-radius:14px;background:#16352d;color:#fff;text-decoration:none;font-weight:800}
  </style>
</head>
<body>
  <main>
    <span>404 · دليل العسيرات</span>
    <h1>الصفحة غير موجودة</h1>
    <p>هذه الصفحة المتخصصة غير منشورة حاليًا. يمكنك العودة إلى الدليل والبحث في النتائج المتاحة.</p>
    <a href="/directory">العودة إلى الدليل</a>
  </main>
</body>
</html>`,
    {
      status: 404,
      statusText: 'Not Found',
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-robots-tag': 'noindex, follow',
        'cache-control': 'public, max-age=0, s-maxage=3600',
      },
    },
  );
}

export function proxy(request: NextRequest) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return NextResponse.next();
  }

  const segments = request.nextUrl.pathname.split('/').filter(Boolean).map(decodeSegment);

  if (segments.length === 1 && segments[0] === 'admin') {
    const hasAuthSession = request.cookies.has(AUTH_ACCESS_COOKIE)
      || request.cookies.has(AUTH_REFRESH_COOKIE);
    if (!hasAuthSession) {
      return NextResponse.redirect(new URL('/account/login', request.url));
    }
  }

  if (segments[0] === 'services' && segments.length === 2) {
    if (!allowedServiceIntents.has(segments[1] as 'electrician' | 'plumber' | 'libraries')) {
      return hardNotFoundResponse();
    }
  }

  if (segments[0] === 'villages' && segments.length === 3) {
    const routeKey = `${segments[1]}/${segments[2]}`;
    if (!allowedVillageCategoryLandings.has(routeKey)) {
      return hardNotFoundResponse();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/services/:intent', '/villages/:slug/:category'],
};
