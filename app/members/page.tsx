import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublicMembers } from '@/lib/community-profiles';
import { buildPageMetadata } from '@/lib/metadata';

export const revalidate = 60;

export const metadata: Metadata = buildPageMetadata({
  title: 'أعضاء مجتمع دليل العسيرات',
  description: 'تعرّف على أعضاء دليل العسيرات الذين اختاروا إظهار صفحاتهم العامة ومساهماتهم المنشورة داخل المجتمع.',
  path: '/members',
});

function formatJoined(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-EG', { month: 'short', year: 'numeric' }).format(new Date(value));
  } catch {
    return '';
  }
}

export default async function MembersPage() {
  const members = await getPublicMembers();
  const totalContributions = members.reduce((sum, member) => sum + member.contributionCount, 0);
  const activeMembers = members.filter((member) => member.badges.length > 0).length;

  return (
    <main id="main-content" className="community-members-page">
      <section className="community-members-hero">
        <div className="shell community-members-hero__inner">
          <div className="community-members-hero__copy">
            <span>Community V2</span>
            <h1>أعضاء مجتمع دليل العسيرات</h1>
            <p>
              هنا تظهر فقط الحسابات التي اختار أصحابها تفعيل الصفحة العامة. لا نعرض بريدًا إلكترونيًا
              أو رقم هاتف، ويظل إظهار القرية والنجع اختيارًا مستقلًا بيد العضو.
            </p>
            <div className="community-members-hero__actions">
              <Link href="/account">إدارة صفحتي العامة</Link>
              <Link href="/directory">استكشف الدليل</Link>
            </div>
          </div>
          <aside className="community-members-hero__stats" aria-label="إحصاءات المجتمع">
            <span><b>{members.length.toLocaleString('ar-EG')}</b><small>عضو ظاهر</small></span>
            <span><b>{totalContributions.toLocaleString('ar-EG')}</b><small>مساهمة منشورة</small></span>
            <span><b>{activeMembers.toLocaleString('ar-EG')}</b><small>أعضاء بشارات</small></span>
          </aside>
        </div>
      </section>

      <section className="shell community-members-content">
        <div className="community-members-heading">
          <div>
            <span>المجتمع المحلي</span>
            <h2>الأعضاء المشاركون علنًا</h2>
            <p>التقييمات والردود المفيدة ترفع عداد المساهمات وتُظهر الشارات تلقائيًا وفق نشاط الحساب.</p>
          </div>
          <span className="community-members-heading__count">{members.length.toLocaleString('ar-EG')} عضو</span>
        </div>

        {members.length ? (
          <div className="community-members-grid">
            {members.map((member) => {
              const initial = member.displayName.trim().charAt(0) || 'ع';
              const location = [member.locality, member.village].filter(Boolean).join(' · ');
              return (
                <Link href={'/members/' + member.slug} className="community-member-card" key={member.slug}>
                  <header>
                    <span className={'community-member-card__avatar' + (member.avatarUrl ? ' has-photo' : '')}>
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      ) : <span aria-hidden="true">{initial}</span>}
                    </span>
                    <div>
                      <h3>{member.displayName}</h3>
                      <small>عضو منذ {formatJoined(member.joinedAt) || 'فترة'}</small>
                    </div>
                    <b aria-hidden="true">←</b>
                  </header>

                  {member.badges.length ? (
                    <div className="community-badges" aria-label="شارات العضو">
                      {member.badges.map((badge) => (
                        <span className={'community-badge is-' + badge.key} key={badge.key}>{badge.label}</span>
                      ))}
                    </div>
                  ) : null}

                  {member.bio ? <p>{member.bio}</p> : <p className="is-muted">عضو مشارك في مجتمع دليل العسيرات.</p>}
                  {location ? <span className="community-member-card__location">⌖ {location}</span> : null}

                  <footer>
                    <span><b>{member.contributionCount.toLocaleString('ar-EG')}</b> مساهمة</span>
                    <span><b>{member.helpfulReceived.toLocaleString('ar-EG')}</b> مفيد</span>
                    <span><b>{member.likeReceived.toLocaleString('ar-EG')}</b> إعجاب</span>
                  </footer>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="community-members-empty">
            <span aria-hidden="true">✦</span>
            <strong>لا توجد صفحات عامة مفعّلة بعد</strong>
            <p>يمكن لأي عضو مسجل تفعيل ظهوره من إعدادات حسابه متى أراد.</p>
          </div>
        )}

        <aside className="community-badge-guide" aria-labelledby="community-badge-guide-title">
          <div>
            <span>كيف تعمل الشارات؟</span>
            <h2 id="community-badge-guide-title">نشاط مفيد، بدون ادعاء توثيق هوية</h2>
          </div>
          <div>
            <article>
              <span className="community-badge is-active">عضو نشط</span>
              <p>تظهر بعد 3 مساهمات عامة أو أكثر من تقييمات وردود منشورة.</p>
            </article>
            <article>
              <span className="community-badge is-trusted">مساهم موثوق</span>
              <p>تتطلب 5 مساهمات على الأقل و3 إشارات «مفيد» من عضوين مختلفين أو أكثر. وهي شارة جودة مساهمة وليست توثيق هوية.</p>
            </article>
          </div>
        </aside>
      </section>
    </main>
  );
}
