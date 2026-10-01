import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { categories, directoryStats, villages } from '@/lib/data';
import { ListingCard } from '@/components/listing-card';
import { BlogCard } from '@/components/blog-card';
import { CategoryVisual } from '@/components/category-visual';
import { BrandMark } from '@/components/brand-mark';
import { FaqSection } from '@/components/faq-section';
import { HomeMemberReviews } from '@/components/home-member-reviews';
import { SmartLocalCompass } from '@/components/smart-local-compass';
import { HomeNews } from '@/components/home-news';
import { homeFaq } from '@/lib/faq';
import { blogArticles } from '@/lib/blog-published';
import { siteConfig } from '@/lib/site';
import { imageForCategory } from '@/lib/directory-images';
import { getPublicDirectoryListings } from '@/lib/public-directory';

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
    <main id="main-content" className="home-redesign">
      <section className="us-hero" aria-labelledby="us-hero-title">
        <div className="shell us-hero__grid">
          <div className="us-hero__copy">
            <div className="us-hero__eyebrow"><span>من قلب سوهاج</span><span>من أهل البلد، لأهل البلد</span></div>
            <h1 id="us-hero-title">العسيرات…<br /><em>أقرب لك.</em></h1>
            <p>دكتور تطمّن عنده، صنعة تحتاجها، أو شغل قريب منك.<br className="us-desktop-break" /> دوّر في بلدك وقراها… والباقي علينا.</p>
            <SmartLocalCompass villages={villages.filter((village) => village.name !== 'مركز العسيرات').map(({ name, slug }) => ({ name, slug }))} />
            <div className="us-hero__stats" aria-label="تغطية دليل العسيرات">
              <span><b>{allListings.length.toLocaleString('ar-EG')}</b><small>سجل منشور</small></span>
              <span><b>{directoryStats.villages.toLocaleString('ar-EG')}</b><small>قرى تجمعنا</small></span>
              <span><b>{googleVerifiedCount.toLocaleString('ar-EG')}</b><small>مرجع على الخرائط</small></span>
            </div>
          </div>
          <aside className="us-place" aria-label="العسيرات، محافظة سوهاج">
            <Image src="/images/directory/hero-al-osairat.webp" alt="مشهد تعبيري لحقول وقرى العسيرات عند الشروق" fill preload sizes="(max-width: 760px) 92vw, (max-width: 1100px) 40vw, 490px" />
            <div className="us-place__top"><span><BrandMark /></span><small>صورة تعبيرية</small></div>
            <div className="us-place__caption"><span>هنا جذورنا، وهنا حكايتنا</span><strong>بلد واحدة.<br />وحكايات كتير.</strong><Link prefetch={false} href="/villages">اكتشف قرى العسيرات</Link></div>
            <span className="us-place__coordinate" aria-hidden="true">العسيرات / سوهاج / مصر</span>
          </aside>
        </div>
        <nav className="shell us-section-nav" aria-label="اكتشف الصفحة">
          <span>خُد لك لفة</span><a href="#services">الخدمات</a><a href="#villages">القرى</a><a href="#latest-news">الأخبار</a><a href="#stories">حكايات بلدنا</a><Link prefetch={false} href="/install">الدليل على موبايلك</Link>
        </nav>
      </section>

      <section className="home-route-rail shell" aria-labelledby="home-route-title">
        <div className="home-route-rail__intro">
          <span className="eyebrow eyebrow--dark">من هنا تبدأ</span>
          <h2 id="home-route-title">اختار أقصر طريق للمعلومة</h2>
          <p>بدل ما تلف في صفحات كثيرة، ادخل من الباب المناسب لاحتياجك مباشرة.</p>
        </div>
        <div className="home-route-rail__grid">
          <Link prefetch={false} href="/directory" className="home-route-card home-route-card--primary">
            <span className="home-route-card__index" aria-hidden="true">01</span>
            <span className="home-route-card__kicker">بحث مباشر</span>
            <strong>عايز خدمة دلوقتي؟</strong>
            <small>ابحث بالاسم أو التخصص أو القرية، ووصل للنتيجة في أقل خطوات.</small>
            <span className="home-route-card__cta">افتح الدليل <b aria-hidden="true">←</b></span>
          </Link>
          <Link prefetch={false} href="/villages" className="home-route-card">
            <span className="home-route-card__index" aria-hidden="true">02</span>
            <span className="home-route-card__kicker">حسب المكان</span>
            <strong>ابدأ من قريتك</strong>
            <small>استكشف كل قرية وما نُشر فيها من خدمات ونجوع وتوابع.</small>
            <span className="home-route-card__cta">استكشف القرى <b aria-hidden="true">←</b></span>
          </Link>
          <Link prefetch={false} href="/community" className="home-route-card">
            <span className="home-route-card__index" aria-hidden="true">03</span>
            <span className="home-route-card__kicker">نبض الناس</span>
            <strong>شوف المجتمع بيقول إيه</strong>
            <small>نقاشات وتجارب وردود أعضاء الدليل في مساحة محلية واحدة.</small>
            <span className="home-route-card__cta">ادخل المجتمع <b aria-hidden="true">←</b></span>
          </Link>
          <Link prefetch={false} href="/news" className="home-route-card">
            <span className="home-route-card__index" aria-hidden="true">04</span>
            <span className="home-route-card__kicker">آخر المستجدات</span>
            <strong>اعرف الجديد في العسيرات</strong>
            <small>موجز أخبار محلي مرتب مع الرجوع للمصدر الأصلي عند القراءة.</small>
            <span className="home-route-card__cta">تابع الأخبار <b aria-hidden="true">←</b></span>
          </Link>
          <Link prefetch={false} href="/jobs" className="home-route-card home-route-card--jobs">
            <span className="home-route-card__index" aria-hidden="true">05</span>
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
            <h2>ابدأ بنوع الخدمة التي تحتاج إليها</h2>
            <p>الأقسام مرتبة لتصل إلى المعلومة أو المكان بأقل عدد من الخطوات.</p>
          </div>
          <Link prefetch={false} href="/directory" className="text-link text-link--arrow">عرض الدليل بالكامل <b aria-hidden="true">←</b></Link>
        </div>
        <div className="category-grid category-grid--editorial">
          {categories.map((category) => {
            const count = allListings.filter((item) => item.category === category.id).length;
            const categoryImage = imageForCategory(category.id);
            return (
              <Link prefetch={false} key={category.id} href={`/directory/${category.id}`} className={`us-category-card us-category-card--${category.id}`}>
                <div className="us-category-card__media">
                  <Image
                    src={categoryImage.src}
                    alt={categoryImage.alt}
                    fill
                    sizes="(max-width: 760px) 96px, (max-width: 1100px) 30vw, 280px"
                  />
                  <span className="us-category-card__media-shade" aria-hidden="true" />
                  <CategoryVisual category={category.id} size="md" />
                  <span className="directory-media__label">صورة تعبيرية</span>
                </div>
                <span className="us-category-card__number">{String(count).padStart(2, '0')}</span>
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
              <span className="eyebrow eyebrow--dark">اكتشف حسب القرية</span>
              <h2>ابدأ من المكان الأقرب لك</h2>
              <p>قرى العسيرات الأعلى تغطية في الدليل حاليًا، مرتبة تلقائيًا حسب عدد السجلات المنشورة.</p>
            </div>
            <Link prefetch={false} href="/villages" className="text-link text-link--arrow">كل قرى العسيرات <b aria-hidden="true">←</b></Link>
          </div>

          <div className="home-village-grid">
            {villageDiscovery.map((village, index) => (
              <Link prefetch={false} key={village.slug} href={`/villages/${village.slug}`} className="home-village-card">
                <span className="home-village-card__index">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{village.name}</h3>
                  <p>{village.description}</p>
                </div>
                <div className="home-village-card__meta">
                  <span><b>{village.count}</b> سجل منشور</span>
                  <span><b>{village.localities.length}</b> تابع ونجع</span>
                </div>
                <span className="home-village-card__cta">استكشف القرية <b aria-hidden="true">←</b></span>
              </Link>
            ))}
          </div>
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
              <span className="eyebrow eyebrow--dark">من مدونة العسيرات</span>
              <h2>اعرف المكان قبل أن تبحث فيه</h2>
              <p>محتوى محلي يضيف سياقًا للقرى والمعالم والشخصيات والمعلومات المرتبطة بالعسيرات.</p>
            </div>
            <Link prefetch={false} href="/blog" className="text-link text-link--arrow">كل المقالات <b aria-hidden="true">←</b></Link>
          </div>
          <div className="blog-grid blog-grid--home">
            {blogArticles.slice(0, 3).map((article) => <BlogCard key={article.slug} article={article} />)}
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
