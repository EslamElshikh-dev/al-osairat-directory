import type { Metadata } from 'next';
import Link from 'next/link';
import { CommunityActivityFeed } from '@/components/community-activity-feed';
import { getPublicCommunityActivity } from '@/lib/community-activity';
import { getPublicMembers } from '@/lib/community-profiles';
import { buildPageMetadata } from '@/lib/metadata';

export const revalidate = 60;

export const metadata: Metadata = buildPageMetadata({
  title: 'مجتمع دليل العسيرات | أحدث التقييمات والردود',
  description: 'تابع أحدث التقييمات والردود العامة من أعضاء مجتمع دليل العسيرات الذين اختاروا الظهور العام.',
  path: '/community',
});

export default async function CommunityPage() {
  const [items, members] = await Promise.all([
    getPublicCommunityActivity(40),
    getPublicMembers(),
  ]);
  const reviewCount = items.filter((item) => item.kind === 'review').length;
  const replyCount = items.length - reviewCount;

  return (
    <main id="main-content" className="community-activity-page">
      <section className="community-activity-hero">
        <div className="shell community-activity-hero__inner">
          <div>
            <span>Community V2.3</span>
            <h1>نبض مجتمع دليل العسيرات</h1>
            <p>
              مساحة تجمع أحدث التقييمات والردود المنشورة من الأعضاء الذين اختاروا الظهور العام.
              لا نعرض نشاط الحسابات الخاصة، ولا هوية من ضغط «مفيد» أو «إعجاب».
            </p>
            <div className="community-activity-hero__actions">
              <Link href="/members">استكشف الأعضاء</Link>
              <Link href="/account">إدارة صفحتي</Link>
            </div>
          </div>
          <aside aria-label="إحصاءات النشاط العام">
            <span><b>{members.length.toLocaleString('ar-EG')}</b><small>عضو ظاهر</small></span>
            <span><b>{reviewCount.toLocaleString('ar-EG')}</b><small>تقييم حديث</small></span>
            <span><b>{replyCount.toLocaleString('ar-EG')}</b><small>رد حديث</small></span>
          </aside>
        </div>
      </section>

      <section className="shell community-activity-content">
        <div className="community-members-heading">
          <div>
            <span>المساهمات العامة</span>
            <h2>أحدث ما شاركه المجتمع</h2>
            <p>المحتوى هنا مأخوذ فقط من مساهمات منشورة وحسابات فعّلت الصفحة العامة.</p>
          </div>
          <Link href="/members" className="community-activity-members-link">دليل الأعضاء ←</Link>
        </div>

        {items.length ? (
          <CommunityActivityFeed items={items} />
        ) : (
          <div className="community-members-empty community-activity-empty">
            <span aria-hidden="true">✦</span>
            <strong>لا توجد مساهمات عامة ظاهرة بعد</strong>
            <p>سيظهر النشاط هنا تلقائيًا عندما يفعّل أعضاء المجتمع صفحاتهم العامة.</p>
          </div>
        )}
      </section>
    </main>
  );
}
