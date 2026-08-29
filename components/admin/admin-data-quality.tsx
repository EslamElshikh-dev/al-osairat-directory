import Link from 'next/link';
import { AdminDataSync } from '@/components/admin/admin-data-sync';
import { listings } from '@/lib/data';
import { mergeDirectoryListings } from '@/lib/directory-query';
import { applyListingOverrides } from '@/lib/listing-overrides';
import { getPublishedListings } from '@/lib/published-listings';
import { listingDataQualityScore } from '@/lib/seo-growth';

function statusLabel(status: string) {
  if (status === 'google_verified') return 'Google موثق';
  if (status === 'cross_checked') return 'مراجع';
  if (status === 'needs_review') return 'يحتاج مراجعة';
  return 'مصدر أساسي';
}

export async function AdminDataQuality() {
  const [publishedListings, overriddenListings] = await Promise.all([
    getPublishedListings(),
    applyListingOverrides(listings),
  ]);
  const allListings = mergeDirectoryListings(overriddenListings, publishedListings)
    .filter((listing) => listing.category !== 'emergency');

  const scored = allListings.map((listing) => ({ listing, score: listingDataQualityScore(listing) }));
  const total = scored.length;
  const average = total ? Math.round(scored.reduce((sum, item) => sum + item.score, 0) / total) : 0;
  const strong = scored.filter((item) => item.score >= 75).length;
  const needsAttention = scored.filter((item) => item.score < 55).length;
  const needsReview = scored.filter((item) => item.listing.sourceStatus === 'needs_review').length;
  const missingPhone = scored.filter((item) => !item.listing.phone || item.listing.phone === '0').length;
  const missingMap = scored.filter((item) => !item.listing.googlePlaceId && !item.listing.googleMapsUrl).length;
  const missingDescription = scored.filter((item) => !item.listing.description?.trim()).length;
  const missingUpdatedAt = scored.filter((item) => !item.listing.lastUpdatedAt).length;
  const attentionQueue = scored
    .filter((item) => item.score < 70 || item.listing.sourceStatus === 'needs_review')
    .sort((a, b) => a.score - b.score)
    .slice(0, 8);

  return (
    <section id="data-quality" className="admin-data-quality admin-anchor-section" aria-labelledby="data-quality-title">
      <div className="admin-data-quality__heading">
        <div>
          <span>SEO + Data Quality</span>
          <h2 id="data-quality-title">جودة واكتمال بيانات الدليل</h2>
          <p>مؤشر تشغيلي داخلي يعتمد على اكتمال بيانات التواصل والوصف والموقع وحداثة السجل وحالة المصدر. لا يظهر هذا التقييم للزوار.</p>
        </div>
        <div className="admin-data-quality__score" aria-label={`متوسط جودة البيانات ${average} من 100`}>
          <b>{average}</b><span>/ 100</span><small>متوسط الجودة</small>
        </div>
      </div>

      <AdminDataSync expectedCount={scored.length} />

      <div className="admin-data-quality__metrics">
        <article><span>سجلات قوية</span><b>{strong.toLocaleString('ar-EG')}</b><small>75+ نقطة</small></article>
        <article><span>تحتاج أولوية</span><b>{needsAttention.toLocaleString('ar-EG')}</b><small>أقل من 55</small></article>
        <article><span>حالة تحتاج مراجعة</span><b>{needsReview.toLocaleString('ar-EG')}</b><small>sourceStatus</small></article>
        <article><span>بدون هاتف</span><b>{missingPhone.toLocaleString('ar-EG')}</b><small>فرصة تحسين تحويل</small></article>
        <article><span>بدون رابط خرائط</span><b>{missingMap.toLocaleString('ar-EG')}</b><small>فرصة ثقة محلية</small></article>
        <article><span>بدون وصف</span><b>{missingDescription.toLocaleString('ar-EG')}</b><small>فرصة سياق وفهم</small></article>
        <article><span>بدون تاريخ تحديث</span><b>{missingUpdatedAt.toLocaleString('ar-EG')}</b><small>فرصة Freshness</small></article>
        <article><span>إجمالي مفحوص</span><b>{total.toLocaleString('ar-EG')}</b><small>بدون الطوارئ</small></article>
      </div>

      <div className="admin-data-quality__queue">
        <div className="admin-data-quality__queue-head">
          <div><span>قائمة الأولوية</span><h3>أضعف السجلات التي تستحق المراجعة أولًا</h3></div>
          <small>مرتبة آليًا حسب درجة الاكتمال</small>
        </div>
        {attentionQueue.length ? (
          <div className="admin-data-quality__rows">
            {attentionQueue.map(({ listing, score }) => (
              <article key={listing.id}>
                <div>
                  <Link href={`/listing/${encodeURIComponent(listing.slug)}`}>{listing.title}</Link>
                  <p>{listing.village} · {statusLabel(listing.sourceStatus)}</p>
                </div>
                <span className={score < 55 ? 'is-low' : ''}>{score}/100</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-data-quality__empty">لا توجد سجلات منخفضة الجودة حاليًا.</p>
        )}
      </div>
    </section>
  );
}
