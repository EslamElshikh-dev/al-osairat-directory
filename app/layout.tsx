import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { AnalyticsTracker } from '@/components/analytics-tracker';
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
import './admin.css';
import './admin-changes.css';
import './admin-reports.css';
import './admin-analytics.css';
import './admin-analytics-insights.css';
import './card-polish.css';
import './community-verification.css';
import './blog-mobile-fix.css';
import './visual-redesign-phase1.css';

const rootTitle = 'دليل العسيرات | الموسوعة المحلية الشاملة لمركز العسيرات';
const GA_MEASUREMENT_ID = 'G-3768S94PP1';

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
  keywords: siteConfig.keywords,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: rootTitle,
    description: siteConfig.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: rootTitle,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#102a24',
  colorScheme: 'light',
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${siteConfig.url}/#website`,
  url: siteConfig.url,
  name: siteConfig.name,
  alternateName: siteConfig.shortName,
  inLanguage: 'ar-EG',
  description: siteConfig.description,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${siteConfig.url}/directory?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <a className="skip-link" href="#main-content">تخطي إلى المحتوى</a>
        <SiteHeader />
        {children}
        <Footer />
        <MobileNav />
        <AnalyticsTracker />
        <Script id="website-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
        <Script id="ga4-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: true });`}
        </Script>
      </body>
    </html>
  );
}
