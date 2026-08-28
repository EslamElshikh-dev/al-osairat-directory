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
        <Link href="/" className="brand" aria-label="دليل وموسوعة العسيرات - الرئيسية">
          <BrandMark />
          <span>
            <strong>دليل العسيرات</strong>
            <small>الموسوعة المحلية لمركز العسيرات</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="التنقل الرئيسي">
          <Link href="/directory">الدليل</Link>
          <Link href="/villages">القرى</Link>
          <Link href="/directory/doctors">الأطباء</Link>
          <Link href="/directory/shops">المحلات</Link>
          <Link href="/emergency" className="nav-alert">أرقام مهمة</Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer__grid">
        <div className="footer__about">
          <div className="brand brand--footer">
            <BrandMark compact />
            <span><strong>دليل وموسوعة العسيرات</strong></span>
          </div>
          <p>
            مشروع مجتمعي رقمي لتنظيم وإتاحة بيانات الخدمات والأنشطة داخل مركز العسيرات وقراه،
            مع فصل البيانات التي تحتاج مراجعة عن المحتوى المنشور.
          </p>
          <div className="footer__stats">
            <span><b>{directoryStats.total}</b> سجل</span>
            <span><b>{directoryStats.villages}</b> قرى أساسية</span>
            <span><b>{directoryStats.categories}</b> أقسام</span>
          </div>
        </div>
        <div>
          <h2>الأقسام</h2>
          <div className="footer__links">
            {categories.slice(0, 6).map((category) => (
              <Link key={category.id} href={`/directory/${category.id}`}>{category.shortLabel}</Link>
            ))}
          </div>
        </div>
        <div>
          <h2>روابط سريعة</h2>
          <div className="footer__links">
            <Link href="/villages">قرى العسيرات</Link>
            <Link href="/directory/government">الخدمات العامة</Link>
            <Link href="/directory/clerics">المأذون ومشايخ القرى</Link>
            <Link href="/emergency">أرقام الطوارئ</Link>
          </div>
        </div>
      </div>
      <div className="shell footer__bottom">
        <span>© {new Date().getFullYear()} دليل العسيرات</span>
        <span>البيانات قابلة للتحديث والمراجعة المستمرة</span>
        <a href="https://eslam-elshikh.com" target="_blank" rel="noreferrer" className="footer__signature">
          توقيع وتطوير: <b>المهندس إسلام الشيخ</b>
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
