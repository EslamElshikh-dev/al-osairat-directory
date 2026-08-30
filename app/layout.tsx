import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import { GoogleAnalyticsLoader } from '@/components/google-analytics-loader';
import { NavigationScrollManager } from '@/components/navigation-scroll-manager';
import { Footer, MobileNav, SiteHeader } from '@/components/site-shell';
import { siteConfig } from '@/lib/site';
import './globals.css';
import './visual-upgrade.css';
import './faq.css';
import './motion.css';
import './shell-upgrade.css';
import './blog.css';
import './blog-home.css';
import './mobile-polish.css';
import './auth.css';
import './password-strength.css';
import './auth-security-ux.css';
import './auth-google.css';
import './account-upgrade.css';
import './favorites.css';
import './member-profile.css';
import './business-submissions.css';
import './ownership-claims.css';
import './my-businesses.css';
import './notifications.css';
import './notification-popover.css';
import './global-search.css';
import './admin.css';
import './admin-changes.css';
import './admin-reports.css';
import './admin-analytics.css';
import './admin-analytics-insights.css';
import './card-polish.css';
import './community-verification.css';
import './blog-mobile-fix.css';
import './visual-redesign-phase1.css';
import './visual-redesign-phase2.css';
import './visual-redesign-phase3.css';
import './visual-redesign-phase4.css';
import './seo-growth.css';
import './member-reviews.css';
import './member-review-polish.css';
import './directory-scroll-fix.css';
import './directory-ticker.css';
import './navigation-scroll.css';

const rootTitle = 'دليل العسيرات | الموسوعة المحلية الشاملة لمركز العسيرات';
const socialImage = `${siteConfig.url}/api/og`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: rootTitle,
    template: '%s | دليل العسيرات',
  },
  description: siteConfig.description,
  applicationName: siteConfig.shortName,
  verification: {
    google: 'a5AfDDI67VsUYxqSvx00gPy5bqSb1V9YoZ1DX8-GkxY',
  },
  keywords: [
    'العسيرات', 'مركز العسيرات', 'دليل العسيرات', 'قرى العسيرات', 'سوهاج',
    'أطباء العسيرات', 'صيدليات العسيرات', 'محلات العسيرات', 'حرفيين العسيرات',
    'تاريخ العسيرات', 'معالم العسيرات', 'مشاهير العسيرات', 'عائلات العسيرات',
  ],
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: siteConfig.url,
    title: rootTitle,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: socialImage,
        width: 1200,
        height: 630,
        alt: 'دليل وموسوعة العسيرات - الدليل المحلي لمركز العسيرات وقراه',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: rootTitle,
    description: siteConfig.description,
    images: [socialImage],
  },
};

export const viewport: Viewport = {
  themeColor: '#102a24',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const scrollRestorationScript = `
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
  window.addEventListener('pageshow', function () {
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  });
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteConfig.url}#website`,
    name: siteConfig.name,
    alternateName: siteConfig.shortName,
    url: siteConfig.url,
    inLanguage: 'ar-EG',
    description: siteConfig.description,
  };

  return (
    <html lang="ar" dir="rtl">
      <head>
        <script dangerouslySetInnerHTML={{ __html: scrollRestorationScript }} />
      </head>
      <body>
        <Suspense fallback={null}>
          <NavigationScrollManager />
        </Suspense>
        <a className="skip-link" href="#main-content">تجاوز إلى المحتوى</a>
        <SiteHeader />
        {children}
        <Footer />
        <MobileNav />
        <GoogleAnalyticsLoader />
        <AnalyticsTracker />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </body>
    </html>
  );
}
