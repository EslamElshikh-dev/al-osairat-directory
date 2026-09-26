import Link from 'next/link';
import { directoryStats } from '@/lib/data';
import { MobileNav } from './mobile-nav';
import { AccountButton } from './auth/account-button';
import { NotificationBell } from './auth/notification-bell';
import { PublicUpdates } from './public-updates';
import { GlobalSearch } from './global-search';
import footerStyles from './site-footer.module.css';

export { MobileNav };

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span className="brand-mark__ring" />
      <span className="brand-mark__dot" />
      {!compact && <span className="brand-mark__line" />}
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link href="/" className="brand site-header__brand" aria-label="دليل وموسوعة العسيرات - الرئيسية">
          <span className="brand__emblem"><BrandMark /></span>
          <span className="brand__copy">
            <strong>دليل العسيرات</strong>
            <small>الموسوعة المحلية لمركز العسيرات</small>
          </span>
          <span className="brand__scope">سوهاج</span>
        </Link>

        <nav className="desktop-nav" aria-label="التنقل الرئيسي">
          <Link href="/">الرئيسية</Link>
          <Link href="/directory">الدليل</Link>
          <Link href="/villages">القرى</Link>
          <Link href="/localities">النجوع</Link>
          <Link href="/jobs">الوظائف</Link>
          <Link href="/news">الأخبار</Link>
          <Link href="/community" className="nav-optional">المجتمع</Link>
          <Link href="/blog" className="nav-optional">المدونة</Link>
        </nav>

        <div className="header-actions">
          <GlobalSearch />
          <PublicUpdates />
          <NotificationBell />
          <AccountButton />
          <Link href="/emergency" className="header-emergency" aria-label="أرقام الطوارئ والخدمات المهمة">
            <span className="header-emergency__dot" aria-hidden="true" />
            <span className="header-emergency__label">أرقام مهمة</span>
          </Link>
          <Link href="/directory" className="header-cta">
            <span>استكشف الدليل</span>
            <b aria-hidden="true">←</b>
          </Link>
        </div>
      </div>
    </header>
  );
}

const footerRoutes = [
  { href: '/directory', index: '01', title: 'دليل الخدمات', description: 'أنشطة وخدمات مركز العسيرات' },
  { href: '/villages', index: '02', title: 'القرى', description: 'كل قرية والخدمات المتاحة فيها' },
  { href: '/localities', index: '03', title: 'النجوع والتوابع', description: 'الأماكن الأصغر داخل المركز' },
  { href: '/news', index: '04', title: 'أخبار العسيرات', description: 'آخر التغطيات مع مصدرها الأصلي' },
  { href: '/jobs', index: '05', title: 'شغل وفرص', description: 'فرص محلية وفرص سوهاج القريبة' },
  { href: '/blog', index: '06', title: 'مدونة العسيرات', description: 'حكايات وموضوعات من البلد' },
  { href: '/community', index: '07', title: 'مجتمع العسيرات', description: 'نقاشات وتجارب أهل المركز' },
];

const footerUtilities = [
  { href: '/directory', label: 'كل أقسام الدليل' },
  { href: '/news#news-method', label: 'مصادر الأخبار' },
  { href: '/members', label: 'أعضاء المجتمع' },
  { href: '/developer', label: 'عن المطوّر' },
  { href: '/emergency', label: 'أرقام مهمة' },
  { href: '/account', label: 'حسابي' },
];

export function Footer() {
  return (
    <footer className={footerStyles.root}>
      <div className={footerStyles.accent} aria-hidden="true" />
      <div className={`shell ${footerStyles.shell}`}>
        <section className={footerStyles.masthead} aria-labelledby="site-footer-title">
          <div className={footerStyles.identity}>
            <span className={footerStyles.emblem}><BrandMark /></span>
            <div className={footerStyles.identityCopy}>
              <span className={footerStyles.kicker}>من أهل البلد، لأهل البلد</span>
              <h2 id="site-footer-title">دليل وموسوعة العسيرات</h2>
              <p>خدمات العسيرات وقراها ونجوعها وأخبارها في مكان واحد. بنراجع البيانات ونحدّثها، والدليل يكبر بمشاركة أهل البلد.</p>
            </div>
          </div>
          <div className={footerStyles.actions}>
            <Link prefetch={false} href="/directory" className={footerStyles.primaryAction}><span>دوّر على خدمة</span><b aria-hidden="true">←</b></Link>
            <Link prefetch={false} href="/jobs#participate" className={footerStyles.secondaryAction}><span>عندك فرصة عمل؟</span><b aria-hidden="true">←</b></Link>
          </div>
        </section>

        <div className={footerStyles.content}>
          <nav className={footerStyles.routesPanel} aria-labelledby="footer-routes-title">
            <div className={footerStyles.sectionHeading}>
              <div><span>الطريق من هنا</span><h2 id="footer-routes-title">تدوّر على إيه؟</h2></div>
              <small>كل باب يوصّلك لحاجة من بلدنا</small>
            </div>
            <div className={footerStyles.routes}>
              {footerRoutes.map((route) => (
                <Link prefetch={false} href={route.href} className={footerStyles.route} key={route.href}>
                  <span className={footerStyles.routeIndex}>{route.index}</span>
                  <span className={footerStyles.routeCopy}><strong>{route.title}</strong><small>{route.description}</small></span>
                  <b className={footerStyles.routeArrow} aria-hidden="true">←</b>
                </Link>
              ))}
            </div>
          </nav>

          <aside className={footerStyles.side} aria-label="معلومات دليل العسيرات">
            <section className={footerStyles.metrics} aria-labelledby="footer-metrics-title">
              <div className={footerStyles.sectionHeading}>
                <div><span>من أرض العسيرات</span><h2 id="footer-metrics-title">بلدنا في الدليل</h2></div>
              </div>
              <div className={footerStyles.stats}>
                <span><b>{directoryStats.total.toLocaleString('ar-EG')}</b><small>سجل منظم</small></span>
                <span><b>{directoryStats.villages.toLocaleString('ar-EG')}</b><small>قرى أساسية</small></span>
                <span><b>{directoryStats.categories.toLocaleString('ar-EG')}</b><small>أقسام</small></span>
              </div>
            </section>

            <section className={footerStyles.localCard} aria-labelledby="footer-scope-title">
              <span className={footerStyles.localIcon} aria-hidden="true">⌖</span>
              <div><strong id="footer-scope-title">العسيرات وقراها ونجوعها</strong><p>الدليل مخصص لمركز العسيرات في محافظة سوهاج، وبنراجع بياناته ونحدّثها باستمرار.</p></div>
              <Link prefetch={false} href="/emergency">أرقام الطوارئ والخدمات المهمة <b aria-hidden="true">←</b></Link>
            </section>

            <div className={footerStyles.utilities}>
              <h2 id="footer-utilities-title">روابط تهمك</h2>
              <nav className={footerStyles.utilityLinks} aria-labelledby="footer-utilities-title">
                {footerUtilities.map((item) => <Link prefetch={false} href={item.href} key={item.href}>{item.label}<b aria-hidden="true">←</b></Link>)}
              </nav>
            </div>
          </aside>
        </div>

        <div className={footerStyles.bottom}>
          <div className={footerStyles.bottomInfo}>
            <span className={footerStyles.location}><i aria-hidden="true" /> مركز العسيرات · محافظة سوهاج</span>
            <div className={footerStyles.legal}><span>© {new Date().getFullYear()} دليل العسيرات</span><Link prefetch={false} href="/news#news-method">سياسة الأخبار</Link><span>البيانات قابلة للتحديث والمراجعة</span></div>
          </div>
          <Link prefetch={false} href="/developer" className={footerStyles.signature}><span>تصميم وتطوير</span><b>المهندس إسلام الشيخ</b><span aria-hidden="true">←</span></Link>
        </div>
      </div>
    </footer>
  );
}
