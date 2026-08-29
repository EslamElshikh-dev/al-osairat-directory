import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DirectoryExplorer } from '@/components/directory-explorer';
import { CategoryVisual } from '@/components/category-visual';
import { BrandMark } from '@/components/site-shell';
import { categories, categoryById, listings, villages, type DirectoryCategory } from '@/lib/data';
import { mergeDirectoryListings, queryDirectoryListings } from '@/lib/directory-query';
import { queryCanonicalDirectory } from '@/lib/directory-repository';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
import {
  categorySearchProfiles,
  getEligibleServiceIntents,
  getTopSubCategories,
  isVillageCategoryLandingEligible,
  villageCategoryLandingPath,
} from '@/lib/programmatic-seo';
import { buildCollectionStructuredData, isFilteredDirectoryState } from '@/lib/seo-growth';
import { siteConfig } from '@/lib/site';

type CategorySearchParams = { q?: string; village?: string; page?: string };

export function generateStaticParams() {
  return categories.map((category) => ({ category: category.id }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<CategorySearchParams>;
}): Promise<Metadata> {
  const [{ category }, query] = await Promise.all([params, searchParams]);
  const info = categoryById[category as DirectoryCategory];
  if (!info) return {};
  const filtered = isFilteredDirectoryState(query);
  const profile = categorySearchProfiles[info.id];
  const title = profile?.title || `${info.label} في العسيرات`;
  const description = profile?.description || info.description;
  return {
    title,
    description,
    alternates: { canonical: `/directory/${info.id}` },
    openGraph: { title, description, url: `${siteConfig.url}/directory/${info.id}` },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export const dynamic = 'force-dynamic';

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<CategorySearchParams>;
}) {
  const { category } = await params;
  const query = await searchParams;
  const filtered = isFilteredDirectoryState(query);
  const info = categoryById[category as DirectoryCategory];
  if (!info) notFound();

  const queryOptions = {
    category: info.id,
    query: query.q,
    village: query.village,
    page: Number(query.page || 1),
  };

  const [canonicalResult, publishedListings, baseListings] = await Promise.all([
    queryCanonicalDirectory(queryOptions),
    getPublishedListings({ category: info.id }),
    applyListingOverrides(listings),
  ]);

  const allListings = mergeDirectoryListings(baseListings, publishedListings);
  const result = canonicalResult || queryDirectoryListings(allListings, queryOptions);
  const pathname = `/directory/${info.id}`;
  const categoryListings = allListings.filter((item) => item.category === info.id);
  const profile = categorySearchProfiles[info.id];
  const title = profile?.title || `${info.label} في العسيرات`;
  const description = profile?.description || info.description;
  const headingBase = profile?.heading.replace(/\s+في العسيرات$/, '') || info.label;
  const topSpecialties = getTopSubCategories(categoryListings, 8);
  const specialistIntents = getEligibleServiceIntents(allListings).filter(({ intent }) => intent.category === info.id);
  const villageLinks = villages
    .map((village) => ({
      village,
      count: categoryListings.filter((item) => item.village === village.name).length,
      qualified: isVillageCategoryLandingEligible(allListings, village.name, info.id),
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => Number(b.qualified) - Number(a.qualified) || b.count - a.count);
  const villageCount = villageLinks.length;
  const collectionSchema = buildCollectionStructuredData({
    title,
    description,
    path: pathname,
    items: result.items,
    totalItems: result.total,
    page: result.page,
    pageSize: result.pageSize,
    breadcrumbs: [
      { name: 'الرئيسية', path: '' },
      { name: 'الدليل', path: '/directory' },
      { name: info.shortLabel, path: pathname },
    ],
  });

  return (
    <main id="main-content" className="page-main interior-redesign">
      <section className="catalog-hero catalog-hero--category">
        <div className="shell catalog-hero__grid">
          <div className="catalog-hero__copy">
            <div className="catalog-hero__category-identity">
              <CategoryVisual category={info.id} size="lg" />
              <div>
                <span className="catalog-hero__kicker"><BrandMark compact /> قسم متخصص</span>
                <span className="catalog-hero__category-name">{info.shortLabel}</span>
              </div>
            </div>
            <h1>{headingBase} <em>في العسيرات</em></h1>
            <p>{description}</p>
            <div className="catalog-hero__actions">
              <Link href="#directory-results" className="button button--light">عرض النتائج</Link>
              {info.id === 'transport' && (
                <Link href="/transport/add" className="button button--outline-light">أضف سائقًا أو وسيلة مواصلات</Link>
              )}
              <Link href="/directory" className="button button--outline-light">كل أقسام الدليل</Link>
            </div>
          </div>

          <aside className="catalog-hero__summary" aria-label={`ملخص قسم ${info.shortLabel}`}>
            <span className="catalog-hero__summary-label">ملخص القسم</span>
            <div className="catalog-hero__metrics catalog-hero__metrics--two">
              <span><b>{result.total.toLocaleString('ar-EG')}</b><small>نتيجة مطابقة</small></span>
              <span><b>{villageCount.toLocaleString('ar-EG')}</b><small>نطاقًا محليًا</small></span>
            </div>
            <div className="catalog-hero__scope-note">
              <strong>{query.village && query.village !== 'all' ? query.village : 'كل نطاق العسيرات'}</strong>
              <span>يمكن تغيير القرية من أدوات التصفية بالأسفل.</span>
            </div>
          </aside>
        </div>
      </section>

      {profile && (
        <section className="shell seo-growth-hub seo-growth-hub--compact" aria-labelledby="category-authority-title">
          <div className="seo-growth-hub__heading">
            <span>صفحة القسم الأساسية</span>
            <h2 id="category-authority-title">{profile.primaryQuery}</h2>
            <p>{profile.editorial}</p>
          </div>
          {topSpecialties.length > 0 && (
            <div className="seo-growth-hub__links" aria-label={`أبرز تخصصات ${info.shortLabel}`}>
              {topSpecialties.map((item) => <span key={item.label} className="button button--ghost">{item.label} · {item.count.toLocaleString('ar-EG')}</span>)}
            </div>
          )}
        </section>
      )}

      <section id="directory-results" className="shell page-section interior-results-section">
        <DirectoryExplorer
          category={info.id}
          query={query.q || ''}
          village={query.village || 'all'}
          result={result}
          pathname={pathname}
        />
      </section>

      {specialistIntents.length > 0 && (
        <section className="shell seo-growth-hub seo-growth-hub--compact" aria-labelledby="specialist-intents-title">
          <div className="seo-growth-hub__heading">
            <span>بحث حسب التخصص</span>
            <h2 id="specialist-intents-title">صفحات أكثر دقة داخل {info.shortLabel}</h2>
            <p>هذه الصفحات لا تُنشأ إلا للتخصصات التي لديها عدد كافٍ من السجلات وبيانات قابلة للاستخدام.</p>
          </div>
          <nav className="seo-growth-hub__links" aria-label={`تخصصات داخل ${info.shortLabel}`}>
            {specialistIntents.map(({ intent, listings: matched }) => (
              <Link key={intent.id} href={`/services/${intent.id}`}><span>{intent.label}</span><small>{matched.length.toLocaleString('ar-EG')} سجل</small></Link>
            ))}
          </nav>
        </section>
      )}

      {villageLinks.length > 0 && (
        <section className="shell seo-growth-hub" aria-labelledby="category-villages-title">
          <div className="seo-growth-hub__heading">
            <span>تغطية محلية</span>
            <h2 id="category-villages-title">{info.shortLabel} حسب قرى العسيرات</h2>
            <p>التركيبات التي تمتلك بيانات كافية تفتح صفحة محلية متخصصة، أما النتائج الأقل اكتمالًا فتوجّه إلى صفحة القرية الأساسية بدل إنشاء صفحة ضعيفة.</p>
          </div>
          <nav className="seo-growth-hub__links" aria-label={`${info.shortLabel} حسب القرية`}>
            {villageLinks.map(({ village, count, qualified }) => (
              <Link
                key={village.slug}
                href={qualified ? villageCategoryLandingPath(village, info) : `/villages/${encodeURIComponent(village.slug)}`}
              >
                <span>{qualified ? `${info.shortLabel} في ${village.name}` : village.name}</span>
                <small>{count.toLocaleString('ar-EG')} سجل{qualified ? ' · صفحة متخصصة' : ''}</small>
              </Link>
            ))}
          </nav>
        </section>
      )}

      {!filtered && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />}
    </main>
  );
}
