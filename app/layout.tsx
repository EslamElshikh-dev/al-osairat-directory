import type { Metadata, Viewport } from 'next';
import { Footer, MobileNav, SiteHeader } from '@/components/site-shell';
import { siteConfig } from '@/lib/site';
import './globals.css';
import './visual-upgrade.css';
import './faq.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'دليل وموسوعة العسيرات | خدمات وقرى مركز العسيرات بسوهاج',
    template: '%s | دليل العسيرات',
  },
  description: siteConfig.description,
  applicationName: siteConfig.shortName,
  keywords: [
    'العسيرات', 'مركز العسيرات', 'دليل العسيرات', 'قرى العسيرات', 'سوهاج',
    'أطباء العسيرات', 'صيدليات العسيرات', 'محلات العسيرات', 'حرفيين العسيرات',
  ],
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: siteConfig.url,
    title: 'دليل وموسوعة العسيرات',
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: 'summary',
    title: 'دليل وموسوعة العسيرات',
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
