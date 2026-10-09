import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from '@/components/site-image';
import Link from 'next/link';
import { categories, directoryStats, villages } from '@/lib/data';
import { ListingCard } from '@/components/listing-card';
import { BlogCard } from '@/components/blog-card';
import { CategoryVisual } from '@/components/category-visual';
import { BrandMark } from '@/components/brand-mark';
import { HomeRouteIcon } from '@/components/home-route-icon';
import { FaqSection } from '@/components/faq-section';
import { HomeMemberReviews } from '@/components/home-member-reviews';
import { SmartLocalCompass } from '@/components/smart-local-compass';
import { HomeNews } from '@/components/home-news';
import { homeFaq } from '@/lib/faq';
import { blogArticles } from '@/lib/blog-published';
import { siteConfig } from '@/lib/site';
import { imageForCategory } from '@/lib/directory-images';
import { getPublicDirectoryListings } from '@/lib/public-directory';
import styles from './home-atlas.module.css';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

export default async function HomePage() {
  const allListings = await getPublicDirectoryListings();
  const featured = allListings
    .filter((item) => item.sourceStatus === 'google_verified')
    .slice(0, 6);
  const emergency = allListings.filter((item) => item.category === 'emergency');
  const googleVerifiedCount = allListings.filter((item) => item.sourceStatus === 'google_verified').length;
  const villageServices = [
    { id: 'doctors', label: 'دكتور' },
    { id: 'pharmacies', label: 'صيدلية' },
    { id: 'crafts', label: 'حرفي' },
    { id: 'transport', label: 'مواصلات' },
  ] as const;
  const villageDiscovery = villages
    .filter((village) => village.name !== 'مركز العسيرات')
    .map((village) => ({
      ...village,
      count: allListings.filter((item) => item.village === village.name).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'دليل وموسوعة مركز العسيرات',
    url: siteConfig.url,
    inLanguage: 'ar-EG',
    about: {
      '@type': 'Place',
      name: 'مركز العسيرات، محافظة سوهاج، مصر',
      alternateName: ['العسيرات', 'مركز العسيرات', 'El Usayrat'],
      address: {
        '@type': 'PostalAddress',
        addressRegion: 'سوهاج',
        addressCountry: 'EG',
      },
      containsPlace: villages
        .filter((village) => village.name !== 'مركز العسيرات')
        .map((village) => ({
          '@type': 'Place',
          name: village.name,
          url: `${siteConfig.url}/villages/${village.slug}`,
        })),
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: homeFaq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <main id="main-content" className={`home-redesign ${styles.home}`}>
      <section className="us-hero" aria-labelledby="us-hero-title">
        <div className="shell us-hero__grid">
          <div className="us-hero__intro">
            <div className="us-hero__eyebrow"><span>من قلب سوهاج</span><span>من أهل البلد، لأهل البلد</span></div>
            <h1 id="us-hero-title">العسيرات…<br /><em>بلدك بين إيديك.</em></h1>
            <p>دكتور تطمّن عنده، صنعة تحتاجها، أو شغل قريب منك.<br className="us-desktop-break" /> دوّر في بلدك وقراها… والباقي علينا.</p>
          </div>
          <div className="us-hero__search">
            <SmartLocalCompass villages={villages.filter((village) => village.name !== 'مركز العسيرات').map(({ name, slug }) => ({ name, slug }))} />
          </div>
          <div className="us-hero__stats" aria-label="تغطية دليل العسيرات">
            <span><b>{allListings.length.toLocaleString('ar-EG')}</b><small>سجل منشور</small></span>
            <span><b>{directoryStats.villages.toLocaleString('ar-EG')}</b><small>قرى تجمعنا</small></span>
            <span><b>{googleVerifiedCount.toLocaleString('ar-EG')}</b><small>مرجع على الخرائط</small></span>
          </div>
          <aside className={`us-place ${styles.postcard}`} aria-label="العسيرات، محافظة سوهاج">
            <div className={styles.postcardPhoto}>
              <Image src="/images/directory/hero-al-osairat.webp" alt="مشهد تعبيري لحقول وقرى العسيرات عند الشروق" fill preload sizes="(max-width: 760px) 92vw, (max-width: 1100px) 40vw, 490px" />
              <div className={styles.postcardTop}><span>من قلب الصعيد</span><small>صورة تعبيرية</small></div>
              <div className={styles.postcardStamp} aria-hidden="true"><BrandMark /><span>العسيرات<br /><small>سوهاج · مصر</small></span></div>
              <div className={styles.postcardCaption}><span>هنا جذورنا، وهنا حكايتنا</span><strong>بلد لها روح.</strong><p>وحكاية في كل طريق.</p></div>
            </div>
            <div className={styles.postcardFooter}>
              <div><small>ناسها · قراها · خدماتها</small><strong>{directoryStats.villages.toLocaleString('ar-EG')} قرى… وبلد واحدة</strong></div>
              <Link prefetch={false} href="/villages">اكتشف قرى العسيرات <b aria-hidden="true">←</b></Link>
            </div>
          </aside>
        </div>
        <nav className="shell us-section-nav" aria-label="اكتشف الصفحة">
          <span>خُد لك لفة</span><a href="#services">الخدمات</a><a href="#villages">القرى</a><a href="#latest-news">الأخبار</a><a href="#stories">حكايات بلدنا</a><Link prefetch={false} href="/install">الدليل على موبايلك</Link>
        </nav>
      </section>

      <section className="home-route-rail shell" aria-labelledby="home-route-title">
        <div className="home-route-rail__intro">
          <span className="eyebrow eyebrow--dark">من هنا تبدأ</span>
          <h2 id="home-route-title">كل مشوار… وله باب</h2>
          <p>خدمة محتاجها، حكاية تحبها، أو فرصة مستنيها. اختار مشوارك وابدأ من هنا.</p>
        </div>
        <div className="home-route-rail__grid">
          <Link prefetch={false} href="/directory" className="home-route-card home-route-card--primary">
            <span className="home-route-card__index" aria-hidden="true">01</span>
            <HomeRouteIcon kind="directory" />
            <span className="home-route-card__kicker">بحث مباشر</span>
            <strong>عايز خدمة دلوقتي؟</strong>
            <small>ابحث بالاسم أو التخصص أو القرية، ووصل للنتيجة في أقل خطوات.</small>
            <span className="home-route-card__cta">افتح الدليل <b aria-hidden="true">←</b></span>
            <span className={styles.routeCoverage}>{allListings.length.toLocaleString('ar-EG')} سجل منشور · {categories.length.toLocaleString('ar-EG')} قسم</span>
          </Link>
          <Link prefetch={false} href="/villages" className="home-route-card">
            <span className="home-route-card__index" aria-hidden="true">02</span>
            <HomeRouteIcon kind="village" />
            <span className="home-route-card__kicker">حسب المكان</span>
            <strong>ابدأ من قريتك</strong>
            <small>استكشف كل قرية وما نُشر فيها من خدمات ونجوع وتوابع.</small>
            <span className="home-route-card__cta">استكشف القرى <b aria-hidden="true">←</b></span>
          </Link>
          <Link prefetch={false} href="/community" className="home-route-card">
            <span className="home-route-card__index" aria-hidden="true">03</span>
            <HomeRouteIcon kind="community" />
            <span className="home-route-card__kicker">نبض الناس</span>
            <strong>شوف المجتمع بيقول إيه</strong>
            <small>نقاشات وتجارب وردود أعضاء الدليل في مساحة محلية واحدة.</small>
            <span className="home-route-card__cta">ادخل المجتمع <b aria-hidden="true">←</b></span>
          </Link>
          <Link prefetch={false} href="/news" className="home-route-card">
            <span className="home-route-card__index" aria-hidden="true">04</span>
            <HomeRouteIcon kind="news" />
            <span className="home-route-card__kicker">آخر المستجدات</span>
            <strong>اعرف الجديد في العسيرات</strong>
            <small>موجز أخبار محلي مرتب مع الرجوع للمصدر الأصلي عند القراءة.</small>
            <span className="home-route-card__cta">تابع الأخبار <b aria-hidden="true">←</b></span>
          </Link>
          <Link prefetch={false} href="/jobs" className="home-route-card home-route-card--jobs">
            <span className="home-route-card__index" aria-hidden="true">05</span>
            <HomeRouteIcon kind="jobs" />
            <span className="home-route-card__kicker">رزق أهل البلد</span>
            <strong>شغل قريب من دارك</strong>
            <small>فرص العسيرات وقراها، ووظائف مراكز سوهاج كلها في مكان واحد.</small>
            <span className="home-route-card__cta">شوف الوظائف <b aria-hidden="true">←</b></span>
          </Link>
        </div>
      </section>

      <section id="services" className="section shell home-category-section">
        <div className="section-heading section-heading--editorial">
          <div>
            <span className="eyebrow eyebrow--dark">أقسام الموسوعة</span>
            <h2>مشاوير يومك… أقرب مما تتخيل</h2>
            <p>صحتك، بيتك، وشغلك. كل قسم يفتح لك بابًا للخدمات المنشورة في بلدك وقراها.</p>
            <small className={styles.serviceNote}>صور الأقسام تعبيرية للتوضيح.</small>
          </div>
          <Link prefetch={false} href="/directory" className="text-link text-link--arrow">عرض الدليل بالكامل <b aria-hidden="true">←</b></Link>
        </div>
        <div className="category-grid category-grid--editorial">
          {categories.map((category) => {
            const count = allListings.filter((item) => item.category === category.id).length;
            const categoryImage = imageForCategory(category.id);
            return (
              <Link prefetch={false} key={category.id} href={`/directory/${category.id}`} className={`us-category-card us-category-card--${category.id}${category.id === 'doctors' || category.id === 'pharmacies' ? ' us-category-card--spotlight' : ''}`}>
                <div className="us-category-card__media">
                  <Image
                    src={categoryImage.src}
                    alt={categoryImage.alt}
                    fill
                    sizes={category.id === 'doctors' || category.id === 'pharmacies' ? '(max-width: 360px) 80px, (max-width: 760px) 96px, (max-width: 1000px) 38vw, 240px' : '(max-width: 760px) 48px, 80px'}
                  />
                  <span className="us-category-card__media-shade" aria-hidden="true" />
                  <CategoryVisual category={category.id} size="md" />
                  <span className="directory-media__label">صورة تعبيرية</span>
                </div>
                <span className="us-category-card__number"><b>{count.toLocaleString('ar-EG')}</b><small>سجل</small></span>
                <h3>{category.shortLabel}</h3>
                <p>{category.description}</p>
                <span className="us-category-card__arrow">استكشف القسم <b aria-hidden="true">←</b></span>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="villages" className="section section--muted home-village-discovery">
        <div className="shell">
          <div className="section-heading section-heading--editorial">
            <div>
              <span className="eyebrow eyebrow--dark">قرى تجمعنا</span>
              <h2>كل قرية… باب لحكاية</h2>
              <p>ابدأ من قريتك وشوف خدماتها ونجوعها. القرى هنا مرتبة حسب عدد السجلات المنشورة في الدليل.</p>
            </div>
            <Link prefetch={false} href="/villages" className="text-link text-link--arrow">كل قرى العسيرات <b aria-hidden="true">←</b></Link>
          </div>

          <div className={styles.villageHorizon} aria-hidden="true" />
          <div className="home-village-grid">
            {villageDiscovery.map((village, index) => (
              <Link prefetch={false} key={village.slug} href={`/villages/${village.slug}`} className="home-village-card">
                <span className="home-village-card__index" aria-hidden="true">{(index + 1).toLocaleString('ar-EG', { minimumIntegerDigits: 2 })}</span>
                <span className="home-village-card__mark" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false"><path d="M24 41s12-11 12-22a12 12 0 1 0-24 0c0 11 12 22 12 22Z" /><circle cx="24" cy="19" r="4" /><path d="M11 41h26" /></svg></span>
                <div>
                  <h3>{village.name}</h3>
                  <p>{village.description}</p>
                </div>
                <div className="home-village-card__meta">
                  <span><b>{village.count.toLocaleString('ar-EG')}</b> سجل منشور</span>
                  <span><b>{village.localities.length.toLocaleString('ar-EG')}</b> تابع ونجع</span>
                </div>
                {village.localities.length > 0 && <div className={styles.localities}><small>من نجوعها وتوابعها</small><div>{village.localities.slice(0, 2).map((locality) => <span key={locality}>{locality}</span>)}</div></div>}
                <span className="home-village-card__cta">استكشف القرية <b aria-hidden="true">←</b></span>
              </Link>
            ))}
          </div>
          <form className={styles.villageJourney} action="/directory" method="get" aria-labelledby="village-journey-title">
            <div><span>مشوار من قريتك</span><h3 id="village-journey-title">قريتك الأول… والخدمة بعدها</h3><p>اختار القرية، واضغط على الخدمة علشان تشوف اللي نُشر فيها.</p></div>
            <div className={styles.journeyControls}>
              <label htmlFor="journey-village">ابدأ من قريتك</label>
              <select id="journey-village" name="village" defaultValue="all">
                <option value="all">كل العسيرات</option>
                {villages.filter((village) => village.name !== 'مركز العسيرات').map((village) => <option key={village.slug} value={village.name}>{village.name}</option>)}
              </select>
              <div>{villageServices.map((service) => <button key={service.id} type="submit" formAction={`/directory/${service.id}`}>{service.label}<b aria-hidden="true">←</b></button>)}</div>
            </div>
          </form>
        </div>
      </section>

      <Suspense fallback={<section id="latest-news" className="section shell us-news-loading" aria-busy="true"><h2>أخبار العسيرات</h2><p>بنجهّز لك آخر الأخبار…</p></section>}>
        <HomeNews />
      </Suspense>

      <section className="section section--muted section--maps-featured">
        <div className="shell">
          <div className="section-heading section-heading--editorial">
            <div>
              <span className="eyebrow eyebrow--dark">بيانات مرتبطة بخرائط Google</span>
              <h2>أماكن لها مرجع مباشر وواضح</h2>
              <p>مجموعة مختارة من السجلات المرتبطة بصفحات خرائط Google لتسهيل الوصول والتحقق.</p>
            </div>
            <Link prefetch={false} href="/directory" className="text-link text-link--arrow">كل النتائج <b aria-hidden="true">←</b></Link>
          </div>
          <div className="listing-grid listing-grid--featured">
            {featured.map((listing) => <ListingCard key={listing.id} listing={listing} compact />)}
          </div>
        </div>
      </section>

      <section className="section shell home-emergency-section">
        <div className="emergency-strip emergency-strip--editorial">
          <CategoryVisual category="emergency" size="lg" className="emergency-strip__visual" />
          <div>
            <span className="eyebrow eyebrow--light">اتصال سريع</span>
            <h2>أرقام الطوارئ والخدمات المهمة</h2>
            <p>للبلاغات والحالات العاجلة استخدم أرقام الجهات الرسمية المختصرة.</p>
          </div>
          <div className="emergency-strip__numbers">
            {emergency.map((item) => (
              <a key={item.id} href={`tel:${item.phone}`}><span>{item.title}</span><strong>{item.phone}</strong></a>
            ))}
          </div>
          <Link prefetch={false} href="/emergency" className="button button--light">كل الأرقام المهمة</Link>
        </div>
      </section>

      <section id="stories" className="section section--muted home-blog-section home-blog-section--editorial">
        <div className="shell">
          <div className="section-heading section-heading--editorial">
            <div>
              <span className="eyebrow eyebrow--dark">حكايات بلدنا</span>
              <h2>ورا كل مكان… حكاية تستاهل</h2>
              <p>اقرأ عن القرى والمعالم وناس العسيرات، مع مراجع تقدر ترجع لها.</p>
            </div>
            <Link prefetch={false} href="/blog" className="text-link text-link--arrow">كل المقالات <b aria-hidden="true">←</b></Link>
          </div>
          <div className="blog-grid blog-grid--home">
            {blogArticles.slice(0, 3).map((article, index) => <BlogCard key={article.slug} article={article} featured={index === 0} />)}
          </div>
        </div>
      </section>

      <HomeMemberReviews
        targetType="site"
        targetKey="site"
        eyebrow="تجربة أعضاء المجتمع"
        title="كيف تقيّم دليل العسيرات؟"
        description="تقييمات مكتوبة من أعضاء مسجلين تساعدنا على تطوير الدليل وتحسين دقة وسهولة الوصول للمعلومات المحلية."
        prompt="شارك رأيك في تجربة استخدام الدليل"
        className="shell member-reviews--home"
        pageSize={2}
        activationMargin="3600px 0px"
      />

      <FaqSection />

      <section className="section shell data-note data-note--editorial">
        <div><span className="eyebrow eyebrow--dark">منهجية البيانات</span><h2>الدقة قبل العدد</h2><p className="data-note__intro">كل سجل يمر بمنهج واضح قبل أن يصبح جزءًا من تجربة البحث العامة.</p></div>
        <div className="data-note__grid">
          <p><b>01</b> لا يعرض الموقع السجلات غير المؤكدة جغرافيًا ضمن النتائج العامة؛ فالبيانات القديمة تُراجع وتُنقَّح قبل النشر.</p>
          <p><b>02</b> أماكن خرائط Google تُحفظ مع معرف المكان عند توفره، لتسهيل المطابقة ومنع إنشاء سجلات مكررة.</p>
          <p><b>03</b> تُوسم التقييمات المحفوظة من المصدر القديم أو من Google بمصدرها داخليًا، ولا تُستخدم في البيانات المنظّمة بطريقة قد توهم الزائر.</p>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </main>
  );
}
