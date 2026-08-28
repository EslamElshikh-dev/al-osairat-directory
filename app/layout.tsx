import type { Metadata, Viewport } from 'next';
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
import './card-polish.css';
import './community-verification.css';
import './blog-mobile-fix.css';

const rootTitle = 'دليل العسيرات | الموسوعة المحلية الشاملة لمركز العسيرات';

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
  },
  twitter: {
    card: 'summary',
    title: rootTitle,
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#102a24',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    alternateName: siteConfig.shortName,
    url: siteConfig.url,
    inLanguage: 'ar-EG',
    description: siteConfig.description,
  };

  return (
    <html lang="ar" dir="rtl">
      <body>
        <a className="skip-link" href="#main-content">تجاوز إلى المحتوى</a>
        <SiteHeader />
        {children}
        <Footer />
        <MobileNav />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </body>
    </html>
  );
}
