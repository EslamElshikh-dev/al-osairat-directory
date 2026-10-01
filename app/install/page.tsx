import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CopyInstallLink, InstallAction } from '@/components/pwa-setup';
import { siteConfig } from '@/lib/site';
import styles from './install.module.css';

export const metadata: Metadata = {
  title: 'حمّل تطبيق دليل العسيرات',
  description: 'ثبّت دليل العسيرات على شاشة هاتفك من المتصفح. خطوات التثبيت لأندرويد وآيفون ورابط مباشر للمشاركة.',
  alternates: { canonical: '/install' },
};

const installUrl = `${siteConfig.url}/install`;

export default function InstallPage() {
  return (
    <main id="main-content" className={styles.page}>
      <div className={`shell ${styles.content}`}>
        <nav className={styles.breadcrumbs} aria-label="مسار التنقل">
          <Link href="/">الرئيسية</Link><span aria-hidden="true">/</span><span>تثبيت التطبيق</span>
        </nav>

        <section className={styles.hero} aria-labelledby="install-title">
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>دليل العسيرات على موبايلك</span>
            <h1 id="install-title">بلدك قريبة منك، <em>بضغطة واحدة.</em></h1>
            <p>ثبّت دليل العسيرات على الشاشة الرئيسية وافتحه زي أي تطبيق. الخدمات والقرى والأخبار والحكايات كلها في مكانها.</p>
            <div className={styles.primaryAction}><InstallAction /></div>
            <p className={styles.note}>التثبيت مجاني ومن المتصفح مباشرة. أحدث الأخبار والبيانات تحتاج اتصالًا بالإنترنت.</p>
          </div>
          <div className={styles.appCard} aria-label="أيقونة تطبيق دليل العسيرات">
            <span className={styles.appCardLabel}>من أهل البلد، لأهل البلد</span>
            <div className={styles.iconFrame}><Image src="/app-icons/icon-512.png" alt="أيقونة دليل العسيرات" width={132} height={132} priority /></div>
            <strong>دليل العسيرات</strong>
            <span>الدليل في جيبك</span>
            <div className={styles.appCardLine} aria-hidden="true" />
          </div>
        </section>

        <section className={styles.howTo} aria-labelledby="steps-title">
          <div className={styles.sectionHeading}>
            <span>خطوات بسيطة</span>
            <h2 id="steps-title">اختار موبايلك وثبّت الدليل</h2>
            <p>افتح الرابط من متصفح الموبايل نفسه. لو جاي من فيسبوك أو واتساب، اختار «فتح في المتصفح» أولًا.</p>
          </div>
          <div className={styles.platformGrid}>
            <article id="android" className={styles.platformCard}>
              <div className={styles.platformHeader}><span className={styles.platformIcon} aria-hidden="true">A</span><div><span>لأجهزة أندرويد</span><h3>ثبّته من Chrome</h3></div></div>
              <ol>
                <li><span>01</span><p>افتح رابط التحميل في متصفح Chrome.</p></li>
                <li><span>02</span><p>اضغط «ثبّت التطبيق» لو ظهر الزر فوق، أو افتح قائمة ⋮ واختار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</p></li>
                <li><span>03</span><p>أكّد التثبيت، وهتلاقي أيقونة دليل العسيرات على الموبايل.</p></li>
              </ol>
            </article>
            <article id="iphone" className={styles.platformCard}>
              <div className={styles.platformHeader}><span className={styles.platformIcon} aria-hidden="true">i</span><div><span>لأجهزة آيفون</span><h3>أضفه من Safari</h3></div></div>
              <ol>
                <li><span>01</span><p>افتح رابط التحميل في Safari.</p></li>
                <li><span>02</span><p>اضغط زر المشاركة، وبعدها «إضافة إلى الشاشة الرئيسية».</p></li>
                <li><span>03</span><p>لو ظهر خيار «فتح كتطبيق ويب»، خلّيه مفعّل، ثم اضغط «إضافة». هتظهر أيقونة الدليل بين تطبيقاتك.</p></li>
              </ol>
            </article>
          </div>
        </section>

        <section className={styles.shareCard} aria-label="مشاركة رابط تثبيت التطبيق">
          <div><span>هات أصحابك معاك</span><h2>رابط واحد لأندرويد وآيفون</h2><p>ابعت الرابط لأهل العسيرات، وكل واحد يتبع الخطوات اللي تخص موبايله.</p></div>
          <div className={styles.shareAction}><code dir="ltr">{installUrl}</code><CopyInstallLink url={installUrl} /></div>
        </section>
      </div>
    </main>
  );
}
