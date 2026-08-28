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
    <main id="main-content">
      <section className="hero">
        <div className="shell hero__grid">
          <div className="hero__content">
            <span className="eyebrow">الموسوعة المحلية لمركز العسيرات وقراه</span>
            <h1>كل ما تحتاجه في <em>العسيرات</em>… في مكان واحد.</h1>
            <p>
              دليل منظم للأطباء والصيدليات والمحلات والحرفيين والمطاعم والخدمات،
              مبني على بيانات محلية ونتائج خرائط Google مع فصل السجلات غير المؤكدة عن المحتوى المنشور.
            </p>
            <form action="/directory" className="hero-search">
              <span className="hero-search__brand" aria-hidden="true"><BrandMark compact /></span>
              <label className="sr-only" htmlFor="home-search">ابحث في دليل العسيرات</label>
              <input id="home-search" name="q" placeholder="مثال: دكتور أطفال، سباك، صيدلية، أولاد حمزة..." />
              <button type="submit">ابحث الآن</button>
            </form>
            <div className="hero__trust">
              <span><b>{directoryStats.total}</b> سجل منظم</span>
              <span><b>{directoryStats.villages}</b> قرى أساسية</span>
              <span><b>{directoryStats.googleVerified}</b> نتيجة مرتبطة بخرائط Google</span>
            </div>
          </div>
          <aside className="hero__panel" aria-label="أبرز إحصاءات الدليل">
            <div className="hero__panel-head">
              <span>نطاق التغطية</span>
              <strong>مركز العسيرات فقط</strong>
            </div>
            <div className="village-cloud">
              {villages.filter((v) => v.name !== 'مركز العسيرات').map((village) => (
                <Link key={village.slug} href={`/villages/${village.slug}`}>{village.name}</Link>
              ))}
            </div>
            <Link href="/villages" className="text-link">استكشف القرى والتوابع ←</Link>
          </aside>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading">
          <div><span className="eyebrow eyebrow--dark">أقسام الموسوعة</span><h2>دليل مرتب حسب احتياجك</h2></div>
          <Link href="/directory" className="text-link">عرض الدليل بالكامل</Link>
        </div>
        <div className="category-grid">
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
                <span className="category-card__arrow">استكشف القسم ←</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section section--muted">
        <div className="shell">
          <div className="section-heading">
            <div><span className="eyebrow eyebrow--dark">بيانات مرتبطة بخرائط Google</span><h2>أماكن ذات مرجع خرائط مباشر</h2></div>
            <Link href="/directory" className="text-link">كل النتائج</Link>
          </div>
          <div className="listing-grid listing-grid--featured">
            {featured.map((listing) => <ListingCard key={listing.id} listing={listing} compact />)}
          </div>
        </div>
      </section>

      <section className="section shell">
        <div className="emergency-strip">
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

      <section className="section section--muted home-blog-section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow eyebrow--dark">من مدونة العسيرات</span>
              <h2>اقرأ المكان قبل أن تبحث فيه</h2>
            </div>
            <Link href="/blog" className="text-link">كل المقالات</Link>
          </div>
          <div className="blog-grid blog-grid--home">
            {blogArticles.slice(0, 3).map((article) => <BlogCard key={article.slug} article={article} />)}
          </div>
        </div>
      </section>

      <FaqSection />

      <section className="section shell data-note">
        <div><span className="eyebrow eyebrow--dark">منهجية البيانات</span><h2>الدقة قبل العدد</h2></div>
        <div className="data-note__grid">
          <p>الموقع لا يعرض السجلات غير المؤكدة جغرافيًا ضمن النتائج العامة. البيانات القديمة تُراجع وتُنظف قبل النشر.</p>
          <p>أماكن خرائط Google تُحفظ مع معرف المكان عند توفره، لتسهيل المطابقة ومنع إنشاء سجلات مكررة.</p>
          <p>التقييمات المحفوظة من المصدر القديم أو Google موسومة داخليًا بمصدرها، ولا تُستخدم كسكيما تقييمات غنية بشكل مضلل.</p>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </main>
  );
}
