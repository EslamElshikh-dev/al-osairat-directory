import Link from 'next/link';
import { categories, directoryStats, listings, villages } from '@/lib/data';
import { ListingCard } from '@/components/listing-card';
import { BlogCard } from '@/components/blog-card';
import { CategoryVisual } from '@/components/category-visual';
import { BrandMark } from '@/components/site-shell';
import { FaqSection } from '@/components/faq-section';
import { homeFaq } from '@/lib/faq';
import { blogArticles } from '@/lib/blog';
import { siteConfig } from '@/lib/site';

export default function HomePage() {
  const featured = listings
    .filter((item) => item.sourceStatus === 'google_verified')
    .slice(0, 6);
  const emergency = listings.filter((item) => item.category === 'emergency');

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'دليل وموسوعة مركز العسيرات',
    url: siteConfig.url,
    inLanguage: 'ar-EG',
    about: {
      '@type': 'Place',
      name: 'مركز العسيرات، محافظة سوهاج، مصر',
      address: {
        '@type': 'PostalAddress',
        addressRegion: 'سوهاج',
        addressCountry: 'EG',
      },
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
              <span className="hero__live-badge"><i aria-hidden="true" /> دليل محلي محدث باستمرار</span>
              <span className="hero__location">مركز العسيرات · سوهاج</span>
            </div>

            <span className="eyebrow hero__eyebrow">الموسوعة المحلية لمركز العسيرات وقراه</span>
            <h1>دليل العسيرات المحلي… <em>خدمتك ومكانك</em> في بحث واحد.</h1>
            <p>
              ابحث عن الأطباء والصيدليات والمحلات والحرفيين والمطاعم والخدمات داخل مركز العسيرات،
              ببيانات منظمة وروابط خرائط مباشرة تساعدك توصل للمكان الصحيح أسرع.
            </p>

            <form action="/directory" className="hero-search hero-search--premium">
              <span className="hero-search__brand" aria-hidden="true"><BrandMark compact /></span>
              <label className="sr-only" htmlFor="home-search">ابحث في دليل العسيرات</label>
              <input id="home-search" name="q" placeholder="ابحث باسم خدمة، نشاط أو قرية…" />
              <button type="submit"><span>ابحث في الدليل</span><b aria-hidden="true">←</b></button>
            </form>

            <div className="hero__quick-links" aria-label="روابط بحث سريعة">
              <span>وصول سريع</span>
              <Link href="/directory/doctors">الأطباء</Link>
              <Link href="/directory/pharmacies">الصيدليات</Link>
              <Link href="/directory/shops">المحلات</Link>
              <Link href="/villages">القرى</Link>
            </div>

            <div className="hero__trust">
              <span><b>{directoryStats.total}</b><small>سجل منظم</small></span>
              <span><b>{directoryStats.villages}</b><small>قرى أساسية</small></span>
              <span><b>{directoryStats.googleVerified}</b><small>مرجع خرائط مباشر</small></span>
            </div>
          </div>

          <aside className="hero__panel hero__panel--spotlight" aria-label="نطاق تغطية دليل العسيرات">
            <div className="hero__panel-brand" aria-hidden="true">
              <span><BrandMark /></span>
              <i />
            </div>
            <div className="hero__panel-head">
              <div>
                <span>نطاق التغطية</span>
                <strong>من قلب مركز العسيرات</strong>
              </div>
              <span className="hero__panel-status"><i aria-hidden="true" /> محلي</span>
            </div>

            <div className="hero__panel-stat">
              <strong>{directoryStats.total}</strong>
              <div><b>مكان وخدمة</b><span>منظمين داخل دليل واحد</span></div>
            </div>

            <div className="hero__panel-label">استكشف حسب القرية</div>
            <div className="village-cloud">
              {villages.filter((v) => v.name !== 'مركز العسيرات').map((village) => (
                <Link key={village.slug} href={`/villages/${village.slug}`}>{village.name}</Link>
              ))}
            </div>
            <Link href="/villages" className="text-link hero__panel-link">كل القرى والتوابع <b aria-hidden="true">←</b></Link>
          </aside>
        </div>
      </section>

      <section className="section shell home-category-section">
        <div className="section-heading section-heading--editorial">
          <div>
            <span className="eyebrow eyebrow--dark">أقسام الموسوعة</span>
            <h2>ابدأ من نوع الخدمة التي تحتاجها</h2>
            <p>الأقسام مرتبة لتصل للمعلومة أو المكان بأقل عدد من الخطوات.</p>
          </div>
          <Link href="/directory" className="text-link text-link--arrow">عرض الدليل بالكامل <b aria-hidden="true">←</b></Link>
        </div>
        <div className="category-grid category-grid--editorial">
          {categories.map((category) => {
            const count = listings.filter((item) => item.category === category.id).length;
            return (
              <Link key={category.id} href={`/directory/${category.id}`} className={`category-card category-card--${category.id}`}>
                <div className="category-card__visual-row">
                  <CategoryVisual category={category.id} size="md" />
                  <span className="category-card__brand" aria-hidden="true"><BrandMark compact /></span>
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

      <FaqSection />

      <section className="section shell data-note data-note--editorial">
        <div><span className="eyebrow eyebrow--dark">منهجية البيانات</span><h2>الدقة قبل العدد</h2><p className="data-note__intro">كل سجل يمر بمنهج واضح قبل أن يصبح جزءًا من تجربة البحث العامة.</p></div>
        <div className="data-note__grid">
          <p><b>01</b> الموقع لا يعرض السجلات غير المؤكدة جغرافيًا ضمن النتائج العامة. البيانات القديمة تُراجع وتُنظف قبل النشر.</p>
          <p><b>02</b> أماكن خرائط Google تُحفظ مع معرف المكان عند توفره، لتسهيل المطابقة ومنع إنشاء سجلات مكررة.</p>
          <p><b>03</b> التقييمات المحفوظة من المصدر القديم أو Google موسومة داخليًا بمصدرها، ولا تُستخدم كسكيما تقييمات غنية بشكل مضلل.</p>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </main>
  );
}
