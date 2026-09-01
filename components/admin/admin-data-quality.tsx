import Link from 'next/link';
import { AdminDataSync } from '@/components/admin/admin-data-sync';
import styles from '@/components/admin/admin-data-quality.module.css';
import { listings } from '@/lib/data';
import { mergeDirectoryListings } from '@/lib/directory-query';
import {
  getDirectoryAuthorityReport,
  type DirectoryAuthorityQueueItem,
  type DirectoryAuthorityReport,
} from '@/lib/directory-repository';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
import { listingDataQualityScore } from '@/lib/seo-growth';
import type { DirectoryListing } from '@/lib/types';

function statusLabel(status: string) {
  if (status === 'google_verified') return 'Google موثق';
  if (status === 'cross_checked') return 'مراجع من أكثر من مصدر';
  if (status === 'needs_review') return 'يحتاج مراجعة';
  return 'مصدر أساسي فقط';
}

function authorityGaps(item: DirectoryAuthorityQueueItem) {
  const gaps: string[] = [];
  if (item.sourceStatus === 'needs_review') gaps.push('حسم حالة المصدر');
  if (item.missingMapsUrl) gaps.push('رابط Google Maps');
  if (item.missingPlaceId) gaps.push('Place ID');
  if (item.missingPhone) gaps.push('رقم الهاتف');
  if (item.missingDescription) gaps.push('وصف واضح');
  return gaps;
}

function pct(complete: number, total: number) {
  return total ? Math.round((complete / total) * 1000) / 10 : 0;
}

async function buildLegacyFallback(): Promise<DirectoryAuthorityReport> {
  const [publishedListings, overriddenListings] = await Promise.all([
    getPublishedListings(),
    applyListingOverrides(listings),
  ]);
  const allListings = mergeDirectoryListings(overriddenListings, publishedListings)
    .filter((listing) => listing.category !== 'emergency');
  const scored = allListings.map((listing) => ({ listing, score: listingDataQualityScore(listing) }));
  const total = scored.length;
  const missingPhone = scored.filter(({ listing }) => !listing.phone || listing.phone === '0').length;
  const missingDescription = scored.filter(({ listing }) => !listing.description?.trim()).length;
  const missingMapsUrl = scored.filter(({ listing }) => !listing.googleMapsUrl).length;
  const missingPlaceId = scored.filter(({ listing }) => !listing.googlePlaceId).length;
  const googleVerified = scored.filter(({ listing }) => listing.sourceStatus === 'google_verified').length;
  const crossChecked = scored.filter(({ listing }) => listing.sourceStatus === 'cross_checked').length;
  const sourceOnly = scored.filter(({ listing }) => listing.sourceStatus === 'source_only').length;

  const queue = scored
    .map(({ listing, score }) => toLegacyQueueItem(listing, score))
    .filter((item) => item.authorityPriority > 0)
    .sort((a, b) => b.authorityPriority - a.authorityPriority || a.qualityScore - b.qualityScore)
    .slice(0, 12);

  return {
    canonicalReady: true,
    summary: {
      total,
      averageQuality: total ? Math.round((scored.reduce((sum, item) => sum + item.score, 0) / total) * 10) / 10 : 0,
      strong: scored.filter(({ score }) => score >= 75).length,
      needsAttention: scored.filter(({ score }) => score < 55).length,
      needsReview: scored.filter(({ listing }) => listing.sourceStatus === 'needs_review').length,
      missingPhone,
      missingDescription,
      missingMapsUrl,
      missingPlaceId,
      googleVerified,
      crossChecked,
      sourceOnly,
      trusted: googleVerified + crossChecked,
    },
    coverage: {
      trustedPct: pct(googleVerified + crossChecked, total),
      phonePct: pct(total - missingPhone, total),
      descriptionPct: pct(total - missingDescription, total),
      mapsUrlPct: pct(total - missingMapsUrl, total),
      placeIdPct: pct(total - missingPlaceId, total),
    },
    queue,
  };
}

function toLegacyQueueItem(listing: DirectoryListing, qualityScore: number): DirectoryAuthorityQueueItem {
  const missingMapsUrl = !listing.googleMapsUrl;
  const missingPlaceId = !listing.googlePlaceId;
  const missingPhone = !listing.phone || listing.phone === '0';
  const missingDescription = !listing.description?.trim();
  const authorityPriority =
    (listing.sourceStatus === 'needs_review' ? 100 : 0)
    + (missingMapsUrl ? 25 : 0)
    + (missingPlaceId ? 20 : 0)
    + (missingPhone ? 18 : 0)
    + (missingDescription ? 12 : 0)
    + Math.max(0, 70 - qualityScore);

  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    category: listing.category,
    village: listing.village,
    qualityScore,
    sourceStatus: listing.sourceStatus,
    missingMapsUrl,
    missingPlaceId,
    missingPhone,
    missingDescription,
    authorityPriority,
  };
}

function CoverageRow({ label, detail, value }: { label: string; detail: string; value: number }) {
  const safeValue = Math.max(0, Math.min(value, 100));
  return (
    <div className={styles.coverageRow}>
      <div><strong>{label}</strong><small>{detail}</small></div>
      <b>{safeValue.toLocaleString('ar-EG')}%</b>
      <div className={styles.track} aria-hidden="true"><span style={{ width: `${safeValue}%` }} /></div>
    </div>
  );
}

export async function AdminDataQuality() {
  const canonicalReport = await getDirectoryAuthorityReport(12);
  const report = canonicalReport || await buildLegacyFallback();
  const { summary, coverage, queue } = report;

  return (
    <section id="data-quality" className={`${styles.panel} admin-anchor-section`} aria-labelledby="data-quality-title">
      <div className={styles.head}>
        <div className={styles.headCopy}>
          <span>المرحلة السابعة · موثوقية البيانات</span>
          <h2 id="data-quality-title">سلطة واكتمال بيانات الدليل</h2>
          <p>القياس الآن مبني على طبقة البيانات المركزية نفسها: جودة السجل، قوة المصدر، اكتمال خرائط Google وبيانات التواصل والوصف. الهدف ليس زيادة عدد السجلات فقط، بل رفع نسبة السجلات القابلة للتحقق والثقة.</p>
        </div>
        <div className={styles.score} aria-label={`متوسط جودة البيانات ${summary.averageQuality} من 100`}>
          <b>{summary.averageQuality.toLocaleString('ar-EG')}</b><span>/ 100</span><small>متوسط الجودة</small>
        </div>
      </div>

      <div className={styles.sync}><AdminDataSync expectedCount={summary.total} /></div>
      {!canonicalReport ? <p className={styles.fallback}>تعذر قراءة تقرير الطبقة المركزية الآن، لذلك تعرض اللوحة حسابًا احتياطيًا من بيانات التطبيق الحالية.</p> : null}

      <div className={styles.metrics}>
        <article className={styles.metric}><span>سجلات قوية</span><strong>{summary.strong.toLocaleString('ar-EG')}</strong><small>75+ نقطة</small></article>
        <article className={styles.metric}><span>تحتاج أولوية</span><strong>{summary.needsAttention.toLocaleString('ar-EG')}</strong><small>أقل من 55</small></article>
        <article className={styles.metric}><span>حالة تحتاج مراجعة</span><strong>{summary.needsReview.toLocaleString('ar-EG')}</strong><small>يجب حسم المصدر أولًا</small></article>
        <article className={styles.metric}><span>مصادر موثوقة</span><strong>{summary.trusted.toLocaleString('ar-EG')}</strong><small>Google موثق + مراجعة متعددة</small></article>
        <article className={styles.metric}><span>بدون هاتف</span><strong>{summary.missingPhone.toLocaleString('ar-EG')}</strong><small>فجوة تحويل</small></article>
        <article className={styles.metric}><span>بدون رابط خرائط</span><strong>{summary.missingMapsUrl.toLocaleString('ar-EG')}</strong><small>فجوة ثقة محلية</small></article>
        <article className={styles.metric}><span>بدون Place ID</span><strong>{summary.missingPlaceId.toLocaleString('ar-EG')}</strong><small>فجوة ربط وتحقق</small></article>
        <article className={styles.metric}><span>بدون وصف</span><strong>{summary.missingDescription.toLocaleString('ar-EG')}</strong><small>فجوة سياق وفهم</small></article>
      </div>

      <div className={styles.authorityGrid}>
        <section className={styles.card} aria-labelledby="authority-coverage-title">
          <div className={styles.sectionTitle}>
            <span>تغطية البيانات الموثوقة</span>
            <h3 id="authority-coverage-title">نسب تغطية البيانات الأساسية</h3>
            <p>هذه النسب هي المؤشر الأوضح لتقدم المرحلة السابعة من دفعة تنظيف إلى أخرى.</p>
          </div>
          <div className={styles.coverage}>
            <CoverageRow label="مصدر موثوق" detail={`${summary.trusted.toLocaleString('ar-EG')} من ${summary.total.toLocaleString('ar-EG')} سجل`} value={coverage.trustedPct} />
            <CoverageRow label="رقم هاتف" detail={`${(summary.total - summary.missingPhone).toLocaleString('ar-EG')} سجل قابل للاتصال`} value={coverage.phonePct} />
            <CoverageRow label="وصف مكتمل" detail={`${(summary.total - summary.missingDescription).toLocaleString('ar-EG')} سجل`} value={coverage.descriptionPct} />
            <CoverageRow label="رابط Google Maps" detail={`${(summary.total - summary.missingMapsUrl).toLocaleString('ar-EG')} سجل`} value={coverage.mapsUrlPct} />
            <CoverageRow label="Google Place ID" detail={`${(summary.total - summary.missingPlaceId).toLocaleString('ar-EG')} سجل`} value={coverage.placeIdPct} />
          </div>
        </section>

        <section className={styles.card} aria-labelledby="authority-sources-title">
          <div className={styles.sectionTitle}>
            <span>قوة مصادر البيانات</span>
            <h3 id="authority-sources-title">توزيع حالة المصدر</h3>
            <p>نرفع السجلات تدريجيًا من مصدر أساسي إلى مراجعة متعددة أو توثيق Google عندما تتوفر أدلة فعلية.</p>
          </div>
          <div className={styles.sources}>
            <article className={styles.source}><span>Google موثق</span><b>{summary.googleVerified.toLocaleString('ar-EG')}</b><small>أعلى حالة حالية</small></article>
            <article className={styles.source}><span>مراجع من أكثر من مصدر</span><b>{summary.crossChecked.toLocaleString('ar-EG')}</b><small>تحقق متعدد المصادر</small></article>
            <article className={styles.source}><span>مصدر أساسي فقط</span><b>{summary.sourceOnly.toLocaleString('ar-EG')}</b><small>أكبر فرصة للتحسين</small></article>
            <article className={styles.source}><span>يحتاج مراجعة</span><b>{summary.needsReview.toLocaleString('ar-EG')}</b><small>أولوية فورية</small></article>
          </div>
        </section>
      </div>

      <section className={styles.queue} aria-labelledby="authority-queue-title">
        <div className={styles.queueHead}>
          <div><span>قائمة الأولويات الذكية</span><h3 id="authority-queue-title">السجلات ذات أكبر أثر عند إصلاحها</h3></div>
          <small>حالة المصدر ← خرائط وPlace ID ← الهاتف ← الوصف ← درجة الجودة</small>
        </div>
        {queue.length ? (
          <div className={styles.rows}>
            {queue.map((item) => {
              const gaps = authorityGaps(item);
              return (
                <article className={styles.row} key={item.id}>
                  <div className={styles.rowMain}>
                    <div className={styles.identity}>
                      <Link href={`/listing/${encodeURIComponent(item.slug)}`}>{item.title}</Link>
                      <span className={`${styles.status} ${item.sourceStatus === 'needs_review' ? styles.statusReview : ''}`}>{statusLabel(item.sourceStatus)}</span>
                    </div>
                    <p className={styles.meta}>{item.village} · جودة {item.qualityScore.toLocaleString('ar-EG')}/100</p>
                    <div className={styles.gaps} aria-label="فجوات البيانات">
                      {gaps.map((gap) => <span className={styles.gap} key={gap}>{gap}</span>)}
                    </div>
                  </div>
                  <div className={styles.priority} title="كلما ارتفع الرقم زادت أولوية الإصلاح">
                    <b>{item.authorityPriority.toLocaleString('ar-EG')}</b><small>أولوية</small>
                  </div>
                </article>
              );
            })}
          </div>
        ) : <p className={styles.empty}>لا توجد فجوات سلطة بيانات تستحق أولوية حاليًا.</p>}
      </section>
    </section>
  );
}
