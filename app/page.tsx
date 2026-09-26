import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { categories, directoryStats, villages } from '@/lib/data';
import { ListingCard } from '@/components/listing-card';
import { BlogCard } from '@/components/blog-card';
import { NewsCard } from '@/components/news-card';
import { CategoryVisual } from '@/components/category-visual';
import { BrandMark } from '@/components/site-shell';
import { FaqSection } from '@/components/faq-section';
import { MemberReviews } from '@/components/member-reviews';
import { SmartLocalCompass } from '@/components/smart-local-compass';
import { JobsTicker } from '@/components/jobs-ticker';
import { homeFaq } from '@/lib/faq';
import { blogArticles } from '@/lib/blog-published';
import { getLocalNews, selectHomepageNews } from '@/lib/news';
import { siteConfig } from '@/lib/site';
import { imageForCategory } from '@/lib/directory-images';
import { getPublicDirectoryListings } from '@/lib/public-directory';
import newsStyles from './home-news.module.css';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

export default async function HomePage() {
  const [newsFeed, allListings] = await Promise.all([
    getLocalNews(),
    getPublicDirectoryListings(),
  ]);
  const latestNews = selectHomepageNews(newsFeed.items, 4);
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
      <section className="hero hero--editorial">
        <div className="hero__mesh" aria-hidden="true" />
        <div className="shell hero__grid">
          <div className="hero__content">
            <div className="hero__meta-line">
              <span className="hero__live-badge"><i aria-hidden="true" /> دليل محلي متجدد باستمرار</span>
              <span className="hero__location">مركز العسيرات · سوهاج</span>
            </div>

            <span className="eyebrow hero__eyebrow">الموسوعة المحلية لمركز العسيرات وقراه</span>
            <h1>دليل العسيرات المحلي… <em>خدماتك ومكانك</em> في بحث واحد.</h1>
            <p>
              ابحث عن الأطباء والصيدليات والمحلات والحرفيين والمطاعم والخدمات داخل مركز العسيرات،
              ببيانات منظّمة وروابط خرائط مباشرة تساعدك على الوصول إلى المكان المناسب بسرعة.
            </p>

            <SmartLocalCompass
              villages={villages.filter((village) => village.name !== 'مركز العسيرات').map(({ name, slug }) => ({ name, slug }))}
            />

            <div className="hero__trust">
              <span><b>{allListings.length}</b><small>سجل منظم</small></span>
              <span><b>{directoryStats.villages}</b><small>قرى أساسية</small></span>
              <span><b>{googleVerifiedCount}</b><small>مرجع خرائط مباشر</small></span>
            </div>
          </div>

          <aside className="hero__place-card" aria-label="مشهد تعبيري لمركز العسيرات">
            <Image
              src="/images/directory/hero-al-osairat.webp"
              alt="مشهد تعبيري لمركز العسيرات وحقوله وقراه وقت الشروق"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 420px"
            />
            <span className="hero__place-shade" aria-hidden="true" />
            <div className="hero__place-top">
              <span className="hero__place-brand" aria-hidden="true"><BrandMark /></span>
              <span className="directory-media__label">صورة تعبيرية أصلية</span>
            </div>
            <div className="hero__place-orbit" aria-label="ملامح الدليل">
              <span><b>محلي</b><small>مخصص للعسيرات</small></span>
              <span><b>مرتب</b><small>قرية ثم خدمة</small></span>
              <span><b>متجدد</b><small>بيانات ومحتوى</small></span>
            </div>
            <div className="hero__place-caption">
              <span>مركز العسيرات · محافظة سوهاج</span>
              <strong>الأرض والقرى والخدمات في دليل واحد</strong>
              <Link href="/villages">استكشف قرى العسيرات <b aria-hidden="true">←</b></Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="home-route-rail shell" aria-labelledby="home-route-title">
        <div className="home-route-rail__intro">
          <span className="eyebrow eyebrow--dark">من هنا تبدأ</span>
          <h2 id="home-route-title">اختار أقصر طريق للمعلومة</h2>
          <p>بدل ما تلف في صفحات كثيرة، ادخل من الباب المناسب لاحتياجك مباشرة.</p>
        </div>
        <div className="home-route-rail__grid">
          <Link href="/directory" className="home-route-card home-route-card--primary">
            <span className="home-route-card__index" aria-hidden="true">01</span>
            <span className="home-route-card__kicker">بحث مباشر</span>
            <strong>عايز خدمة دلوقتي؟</strong>
            <small>ابحث بالاسم أو التخصص أو القرية، ووصل للنتيجة في أقل خطوات.</small>
            <span className="home-route-card__cta">افتح الدليل <b aria-hidden="true">←</b></span>
          </Link>
          <Link href="/villages" className="home-route-card">
            <span className="home-route-card__index" aria-hidden="true">02</span>
            <span className="home-route-card__kicker">حسب المكان</span>
            <strong>ابدأ من قريتك</strong>
            <small>استكشف كل قرية وما نُشر فيها من خدمات ونجوع وتوابع.</small>
            <span className="home-route-card__cta">استكشف القرى <b aria-hidden="true">←</b></span>
          </Link>
          <Link href="/community" className="home-route-card">
            <span className="home-route-card__index" aria-hidden="true">03</span>
            <span className="home-route-card__kicker">نبض الناس</span>
            <strong>شوف المجتمع بيقول إيه</strong>
            <small>نقاشات وتجارب وردود أعضاء الدليل في مساحة محلية واحدة.</small>
            <span className="home-route-card__cta">ادخل المجتمع <b aria-hidden="true">←</b></span>
          </Link>
          <Link href="/news" className="home-route-card">
            <span className="home-route-card__index" aria-hidden="true">04</span>
            <span className="home-route-card__kicker">آخر المستجدات</span>
            <strong>اعرف الجديد في العسيرات</strong>
            <small>موجز أخبار محلي مرتب مع الرجوع للمصدر الأصلي عند القراءة.</small>
            <span className="home-route-card__cta">تابع الأخبار <b aria-hidden="true">←</b></span>
          </Link>
          <Link href="/jobs" className="home-route-card home-route-card--jobs">
            <span className="home-route-card__index" aria-hidden="true">05</span>
            <span className="home-route-card__kicker">رزق أهل البلد</span>
            <strong>شغل قريب من دارك</strong>
            <small>فرص العسيرات وقراها، ووظائف مراكز سوهاج كلها في مكان واحد.</small>
            <span className="home-route-card__cta">شوف الوظائف <b aria-hidden="true">←</b></span>
          </Link>
        </div>
      </section>
      <JobsTicker />

      <section className="section shell home-category-section">
        <div className="section-heading section-heading--editorial">
          <div>
            <span className="eyebrow eyebrow--dark">أقسام الموسوعة</span>
            <h2>ابدأ بنوع الخدمة التي تحتاج إليها</h2>
            <p>الأقسام مرتبة لتصل إلى المعلومة أو المكان بأقل عدد من الخطوات.</p>
          </div>
          <Link href="/directory" className="text-link text-link--arrow">عرض الدليل بالكامل <b aria-hidden="true">←</b></Link>
        </div>
        <div className="category-grid category-grid--editorial">
          {categories.map((category) => {
            const count = allListings.filter((item) => item.category === category.id).length;
            const categoryImage = imageForCategory(category.id);
            return (
              <Link key={category.id} href={`/directory/${category.id}`} className={`category-card category-card--${category.id}`}>
                <div className="category-card__media">
                  <Image
                    src={categoryImage.src}
                    alt={categoryImage.alt}
                    fill
                    sizes="(max-width: 420px) 96px, (max-width: 760px) 112px, (max-width: 1020px) 50vw, 25vw"
                  />
                  <span className="category-card__media-shade" aria-hidden="true" />
                  <CategoryVisual category={category.id} size="md" />
                  <span className="directory-media__label">صورة تعبيرية</span>
                </div>
                <span className="category-card__number">{String(count).padStart(2, '0')}</span>
                <h3>{category.shortLabel}</h3>
                <p>{category.description}</p>
                <span className="category-card__arrow">استكشف القسم <b aria-hidden="true">←</b></span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section section--muted home-village-discovery">
        <div className="shell">
          <div className="section-heading section-heading--editorial">
            <div>
              <span className="eyebrow eyebrow--dark">اكتشف حسب القرية</span>
              <h2>ابدأ من المكان الأقرب لك</h2>
              <p>قرى العسيرات الأعلى تغطية في الدليل حاليًا، مرتبة تلقائيًا حسب عدد السجلات المنشورة.</p>
            </div>
            <Link href="/villages" className="text-link text-link--arrow">كل قرى العسيرات <b aria-hidden="true">←</b></Link>
          </div>

          <div className="home-village-grid">
            {villageDiscovery.map((village, index) => (
              <Link key={village.slug} href={`/villages/${village.slug}`} className="home-village-card">
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

      <section className={`section ${newsStyles.section}`}>
        <div className="shell">
          <div className="section-heading section-heading--editorial">
            <div>
              <span className="eyebrow eyebrow--dark">مرصد الأخبار المحلي</span>
              <h2>أحدث ما نُشر عن العسيرات وقراها</h2>
              <p>موجزات موثقة داخل الدليل، مع رابط واضح للنص الكامل لدى الناشر الأصلي.</p>
            </div>
            <Link href="/news" className="text-link text-link--arrow">كل أخبار العسيرات <b aria-hidden="true">←</b></Link>
          </div>

          <div className={newsStyles.statusLine}>
            <span><i aria-hidden="true" /> تحديث تلقائي كل 30 دقيقة</span>
            <span>{newsFeed.connectedSourceCount} قنوات متصلة</span>
          </div>

          <div className={newsStyles.grid}>
            {latestNews.map((item) => <NewsCard key={item.id} item={item} compact />)}
          </div>

          <Link href="/news" className={newsStyles.mobileLink}>عرض كل الأخبار <b aria-hidden="true">←</b></Link>
        </div>
      </section>

      <section className="section section--muted section--maps-featured">
        <div className="shell">
          <div className="section-heading section-heading--editorial">
            <div>
              <span className="eyebrow eyebrow--dark">بيانات مرتبطة بخرائط Google</span>
              <h2>أماكن لها مرجع مباشر وواضح</h2>
              <p>مجموعة مختارة من السجلات المرتبطة بصفحات خرائط Google لتسهيل الوصول والتحقق.</p>
            </div>
            <Link href="/directory" className="text-link text-link--arrow">كل النتائج <b aria-hidden="true">←</b></Link>
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
          <Link href="/emergency" className="button button--light">كل الأرقام المهمة</Link>
        </div>
      </section>

      <section className="section section--muted home-blog-section home-blog-section--editorial">
        <div className="shell">
          <div className="section-heading section-heading--editorial">
            <div>
              <span className="eyebrow eyebrow--dark">من مدونة العسيرات</span>
              <h2>اعرف المكان قبل أن تبحث فيه</h2>
              <p>محتوى محلي يضيف سياقًا للقرى والمعالم والشخصيات والمعلومات المرتبطة بالعسيرات.</p>
            </div>
            <Link href="/blog" className="text-link text-link--arrow">كل المقالات <b aria-hidden="true">←</b></Link>
          </div>
          <div className="blog-grid blog-grid--home">
            {blogArticles.slice(0, 3).map((article) => <BlogCard key={article.slug} article={article} />)}
          </div>
        </div>
      </section>

      <MemberReviews
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
