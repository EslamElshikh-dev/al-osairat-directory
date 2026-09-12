import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import { GoogleAnalyticsLoader } from '@/components/google-analytics-loader';
import { NavigationScrollManager } from '@/components/navigation-scroll-manager';
import { SandAssistant } from '@/components/sand-assistant';
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
import './account-upgrade.css';
import './favorites.css';
import './notifications.css';
import './notification-popover.css';
import './global-search.css';
import './card-polish.css';
import './community-verification.css';
import './blog-mobile-fix.css';
import './visual-redesign-phase1.css';
import './visual-redesign-phase2.css';
import './visual-redesign-phase3.css';
import './seo-growth.css';
import './member-reviews.css';
import './member-review-polish.css';
import './directory-scroll-fix.css';
import './directory-ticker.css';
import './navigation-scroll.css';
import './sand-assistant.css';
import './mobile-system.css';
import './visual-redesign-phase4.css';
import './image-system.css';

const rootTitle = 'دليل العسيرات | الموسوعة المحلية الشاملة لمركز العسيرات';
const socialImage = `${siteConfig.url}/images/social-share-ar.png?v=20260830-ar-2`;

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
    'العسيرات', 'العسيرات سوهاج', 'مركز العسيرات', 'مركز العسيرات سوهاج', 'دليل العسيرات', 'قرى العسيرات', 'سوهاج',
    'أطباء العسيرات', 'صيدليات العسيرات', 'محلات العسيرات', 'حرفيين العسيرات',
    'تاريخ العسيرات', 'معالم العسيرات', 'مشاهير العسيرات', 'عائلات العسيرات',
  ],
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: '96x96' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.png',
    apple: [{ url: '/favicon.png', type: 'image/png', sizes: '96x96' }],
  },
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: siteConfig.url,
    title: siteConfig.socialTitle,
    description: siteConfig.socialDescription,
    siteName: siteConfig.shortName,
    images: [
      {
        url: socialImage,
        width: 1200,
        height: 630,
        alt: 'دليل العسيرات - بتدور على إيه؟ وإحنا ندلّك عليه من قلب العسيرات',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.socialTitle,
    description: siteConfig.socialDescription,
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
  const siteSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteConfig.url}#organization`,
        name: siteConfig.name,
        alternateName: siteConfig.shortName,
        url: siteConfig.url,
        logo: {
          '@type': 'ImageObject',
          url: `${siteConfig.url}/icon.svg`,
        },
      },
      {
        '@type': 'Place',
        '@id': `${siteConfig.url}#al-osairat`,
        name: 'مركز العسيرات',
        alternateName: ['العسيرات', 'العسيرات سوهاج', 'مركز العسيرات سوهاج', 'El Usayrat'],
        address: {
          '@type': 'PostalAddress',
          addressRegion: 'سوهاج',
          addressCountry: 'EG',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${siteConfig.url}#website`,
        name: siteConfig.shortName,
        alternateName: [siteConfig.name, 'موسوعة العسيرات', 'دليل مركز العسيرات'],
        url: siteConfig.url,
        inLanguage: 'ar-EG',
        description: siteConfig.description,
        publisher: { '@id': `${siteConfig.url}#organization` },
        about: { '@id': `${siteConfig.url}#al-osairat` },
        creator: {
          '@type': 'Person',
          '@id': 'https://www.eslam-elshikh.com/#person',
          name: 'إسلام الشيخ',
          alternateName: ['المهندس إسلام الشيخ', 'Eslam Elshikh'],
          url: 'https://www.eslam-elshikh.com/',
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteConfig.url}/directory?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
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
        <SandAssistant />
        <MobileNav />
        <GoogleAnalyticsLoader />
        <AnalyticsTracker />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
      </body>
    </html>
  );
}
