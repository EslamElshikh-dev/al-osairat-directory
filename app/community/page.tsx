import type { Metadata } from 'next';
import Link from 'next/link';
import { CommunityActivityFeed } from '@/components/community-activity-feed';
import { getCommunityWeeklyPulse, getPublicCommunityActivity } from '@/lib/community-activity';
import { getPublicMembers } from '@/lib/community-profiles';
import { buildPageMetadata } from '@/lib/metadata';

export const revalidate = 60;

export const metadata: Metadata = buildPageMetadata({
  title: 'مجتمع دليل العسيرات | أحدث التقييمات والردود',
  description: 'تابع أحدث التقييمات والردود العامة من أعضاء مجتمع دليل العسيرات الذين اختاروا الظهور العام.',
  path: '/community',
});

export default async function CommunityPage() {
  const [items, members, pulse] = await Promise.all([
    getPublicCommunityActivity(40),
    getPublicMembers(),
    getCommunityWeeklyPulse(),
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

      <section className="shell community-weekly-pulse" aria-labelledby="community-weekly-pulse-title">
        <div className="community-weekly-pulse__heading">
          <div>
            <span>آخر 7 أيام</span>
            <h2 id="community-weekly-pulse-title">نبض هذا الأسبوع</h2>
            <p>صورة سريعة للمساهمات العامة الحديثة فقط، بدون كشف من ضغط «مفيد» أو أي بيانات حسابات خاصة.</p>
          </div>
          <Link href="/account#following-feed">افتح Feed أتابعهم ←</Link>
        </div>

        <div className="community-weekly-pulse__metrics">
          <article>
            <span>مساهمات جديدة</span>
            <b>{pulse.contributionCount.toLocaleString('ar-EG')}</b>
            <small>تقييمات وردود منشورة</small>
          </article>
          <article>
            <span>أعضاء مشاركون</span>
            <b>{pulse.activeMemberCount.toLocaleString('ar-EG')}</b>
            <small>من الصفحات العامة فقط</small>
          </article>
          <article>
            <span>إشارات «مفيد»</span>
            <b>{pulse.helpfulCount.toLocaleString('ar-EG')}</b>
            <small>خلال آخر 7 أيام</small>
          </article>
        </div>

        {pulse.topHelpful.length ? (
          <div className="community-weekly-pulse__top">
            <div className="community-weekly-pulse__top-heading">
              <span>الأكثر فائدة هذا الأسبوع</span>
              <small>حسب إشارات «مفيد» الحديثة فقط</small>
            </div>
            <div className="community-weekly-pulse__top-grid">
              {pulse.topHelpful.map((item, index) => (
                <article key={item.kind + ':' + item.id}>
                  <div className="community-weekly-pulse__rank" aria-hidden="true">{String(index + 1).padStart(2, '0')}</div>
                  <div>
                    <span>{item.kind === 'review' ? 'تقييم' : 'رد'} · {item.contextLabel}</span>
                    <Link href={'/members/' + item.author.slug}>{item.author.displayName}</Link>
                    <p>{item.body}</p>
                  </div>
                  <footer>
                    <b>✓ {item.weeklyHelpfulCount.toLocaleString('ar-EG')} مفيد</b>
                    <Link href={item.href}>عرض المساهمة ←</Link>
                  </footer>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="community-weekly-pulse__empty">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>لسه مفيش مساهمات أخذت «مفيد» هذا الأسبوع</strong>
              <p>أول مساهمة تحصل على «مفيد» هتظهر هنا تلقائيًا.</p>
            </div>
          </div>
        )}
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
