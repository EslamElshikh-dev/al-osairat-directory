import Link from 'next/link';
import { categories, directoryStats } from '@/lib/data';

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
          <Link href="/villages">القرى</Link>
          <Link href="/directory/doctors">الأطباء</Link>
          <Link href="/directory/shops" className="nav-optional">المحلات</Link>
        </nav>

        <div className="header-actions">
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

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__accent" aria-hidden="true" />

      <div className="shell footer__top">
        <div className="footer__brand-lockup">
          <span className="footer__brand-emblem"><BrandMark /></span>
          <div className="footer__brand-copy">
            <span className="footer__kicker">الموسوعة المحلية لمركز العسيرات وقراه</span>
            <h2>دليل وموسوعة العسيرات</h2>
            <p>
              منصة محلية لتنظيم وإتاحة بيانات الخدمات والأنشطة داخل مركز العسيرات بمحافظة سوهاج،
              بهيكل واضح يساعدك على الوصول للخدمة والقرية والمعلومة بسرعة.
            </p>
          </div>
        </div>

        <div className="footer__top-actions">
          <span className="footer__scope">
            <span className="footer__scope-dot" aria-hidden="true" />
            مركز العسيرات · سوهاج
          </span>
          <Link href="/directory" className="footer__cta">
            <span>استكشف الدليل</span>
            <b aria-hidden="true">←</b>
          </Link>
        </div>
      </div>

      <div className="shell footer__grid">
        <section className="footer__about" aria-labelledby="footer-stats-title">
          <span className="footer__section-label" id="footer-stats-title">الدليل في أرقام</span>
          <div className="footer__stats">
            <span><b>{directoryStats.total}</b> سجل منظم</span>
            <span><b>{directoryStats.villages}</b> قرى أساسية</span>
            <span><b>{directoryStats.categories}</b> أقسام</span>
          </div>
          <p className="footer__note">
            البيانات قابلة للتحديث والمراجعة المستمرة، وتُفصل السجلات غير المؤكدة عن المحتوى المنشور قدر الإمكان.
          </p>
        </section>

        <nav className="footer__column" aria-label="أقسام الدليل">
          <h2>أقسام الدليل</h2>
          <div className="footer__links">
            {categories.slice(0, 5).map((category) => (
              <Link key={category.id} href={`/directory/${category.id}`}>{category.shortLabel}</Link>
            ))}
          </div>
        </nav>

        <nav className="footer__column" aria-label="استكشف المزيد">
          <h2>استكشف</h2>
          <div className="footer__links">
            <Link href="/villages">قرى العسيرات</Link>
            {categories.slice(5, 8).map((category) => (
              <Link key={category.id} href={`/directory/${category.id}`}>{category.shortLabel}</Link>
            ))}
            <Link href="/directory">كل الأقسام</Link>
          </div>
        </nav>

        <section className="footer__column footer__trust-column" aria-labelledby="footer-trust-title">
          <h2 id="footer-trust-title">معلومات مهمة</h2>
          <div className="footer__trust-card">
            <div className="footer__trust-title">
              <span className="footer__trust-icon" aria-hidden="true">✓</span>
              <span>نطاق محلي واضح</span>
            </div>
            <p>التغطية مخصصة لمركز العسيرات وقراه وتوابعه بمحافظة سوهاج.</p>
            <Link href="/emergency" className="footer__emergency-link">أرقام الطوارئ والخدمات المهمة</Link>
          </div>
        </section>
      </div>

      <div className="shell footer__bottom">
        <div className="footer__legal">
          <span>© {new Date().getFullYear()} دليل العسيرات</span>
          <span className="footer__separator" aria-hidden="true">•</span>
          <span>جميع البيانات قابلة للتحديث والمراجعة</span>
        </div>
        <a href="https://www.eslam-elshikh.com/about/" target="_blank" rel="noreferrer" className="footer__signature">
          <span>تصميم وتطوير:</span>
          <b>المهندس إسلام الشيخ</b>
          <span className="footer__signature-arrow" aria-hidden="true">↗</span>
        </a>
      </div>
    </footer>
  );
}

export function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="تنقل الجوال">
      <Link href="/"><span>الرئيسية</span></Link>
      <Link href="/directory"><span>الدليل</span></Link>
      <Link href="/villages"><span>القرى</span></Link>
      <Link href="/emergency"><span>الطوارئ</span></Link>
    </nav>
  );
}
