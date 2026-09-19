import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CommunityFollowButton } from '@/components/community-follow-button';
import { getPublicMemberContributions, getPublicMemberProfileBySlug } from '@/lib/community-profiles';
import { getPublicMemberFollowerCount } from '@/lib/community-follows';
import { buildPageMetadata } from '@/lib/metadata';

export const revalidate = 60;

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function formatFullDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function Stars({ value }: { value: number }) {
  return (
    <span className="community-profile-stars" aria-label={`${value} من 5 نجوم`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={index < Math.round(value) ? 'is-filled' : ''} aria-hidden="true">★</span>
      ))}
    </span>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getPublicMemberProfileBySlug(slug);
  if (!profile) return {};
  return buildPageMetadata({
    title: `${profile.displayName} | عضو دليل العسيرات`,
    description: profile.bio || `الصفحة العامة للعضو ${profile.displayName} في مجتمع دليل العسيرات.`,
    path: `/members/${profile.slug}`,
    imageUrl: profile.avatarUrl || undefined,
    imageAlt: profile.avatarUrl ? `صورة ${profile.displayName}` : undefined,
  });
}

export default async function MemberPublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getPublicMemberProfileBySlug(slug);
  if (!profile) notFound();

  const [contributions, followerCount] = await Promise.all([
    getPublicMemberContributions(profile.userId),
    getPublicMemberFollowerCount(profile.userId),
  ]);
  const initial = profile.displayName.trim().charAt(0) || 'ع';
  const location = [profile.locality, profile.village].filter(Boolean).join(' · ');
  const joinedLabel = formatDate(profile.joinedAt);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    dateCreated: profile.joinedAt,
    mainEntity: {
      '@type': 'Person',
      name: profile.displayName,
      ...(profile.avatarUrl ? { image: profile.avatarUrl } : {}),
      ...(profile.bio ? { description: profile.bio } : {}),
      ...(location ? { homeLocation: { '@type': 'Place', name: location } } : {}),
    },
  };

  return (
    <main id="main-content" className="community-profile-page">
      <section className="community-profile-hero">
        <div className="shell community-profile-hero__inner">
          <div className={`community-profile-avatar${profile.avatarUrl ? ' has-photo' : ''}`}>
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={`صورة ${profile.displayName}`}
                width={118}
                height={118}
                sizes="(max-width: 620px) 94px, 118px"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span aria-hidden="true">{initial}</span>
            )}
            <i aria-hidden="true" />
          </div>

          <div className="community-profile-hero__copy">
            <span className="community-profile-kicker">عضو في مجتمع دليل العسيرات</span>
            <h1>{profile.displayName}</h1>
            <div className="community-profile-meta">
              <span><b aria-hidden="true">✦</b> عضو منذ {joinedLabel || 'فترة'}</span>
              {location ? <span><b aria-hidden="true">⌖</b> {location}</span> : null}
            </div>
            {profile.bio ? (
              <p className="community-profile-bio">{profile.bio}</p>
            ) : (
              <p className="community-profile-bio community-profile-bio--muted">عضو مشارك في مجتمع دليل العسيرات.</p>
            )}
            <CommunityFollowButton slug={profile.slug} initialFollowerCount={followerCount} />
            {contributions.badges.length ? (
              <>
                <div className="community-profile-badge-row" aria-label="شارات العضو">
                  {contributions.badges.map((badge) => (
                    <span className={'community-badge is-' + badge.key} key={badge.key}>{badge.label}</span>
                  ))}
                </div>
                {contributions.badges.some((badge) => badge.key === 'trusted') ? (
                  <p className="community-profile-badge-note">شارة «مساهم موثوق» تقيس جودة المساهمة المجتمعية ولا تعني توثيق هوية الشخص.</p>
                ) : null}
              </>
            ) : null}
          </div>

          <aside className="community-profile-stats is-v2" aria-label="مساهمات العضو">
            <span>
              <b>{contributions.contributionCount.toLocaleString('ar-EG')}</b>
              <small>إجمالي المساهمات</small>
            </span>
            <span>
              <b>{contributions.reviewCount.toLocaleString('ar-EG')}</b>
              <small>تقييمات منشورة</small>
            </span>
            <span>
              <b>{contributions.replyCount.toLocaleString('ar-EG')}</b>
              <small>ردود منشورة</small>
            </span>
            <span>
              <b>{contributions.helpfulReceived.toLocaleString('ar-EG')}</b>
              <small>إشارات «مفيد»</small>
            </span>
          </aside>
        </div>
      </section>

      <section className="shell community-profile-content">
        <div className="community-profile-section-heading">
          <div>
            <span>مساهمات العضو</span>
            <h2>التقييمات المنشورة</h2>
            <p>هذه التقييمات كتبها العضو بنفسه من حسابه المسجل في دليل العسيرات.</p>
          </div>
          <Link href="/members">كل الأعضاء ←</Link>
        </div>

        {contributions.reviews.length ? (
          <div className="community-profile-reviews">
            {contributions.reviews.map((review) => (
              <article className="community-profile-review" key={review.id}>
                <header>
                  <div>
                    <span>{review.targetType === 'site' ? 'تقييم للدليل' : 'تقييم لمقال'}</span>
                    <Link href={review.href}>{review.targetLabel}</Link>
                  </div>
                  <time dateTime={review.createdAt}>{formatFullDate(review.createdAt)}</time>
                </header>
                <Stars value={review.rating} />
                <p>{review.body}</p>
                <footer>
                  {review.updatedAt !== review.createdAt ? <span>تم تعديل التقييم</span> : <span>تقييم منشور</span>}
                  <Link href={review.href}>عرض مكان التقييم ←</Link>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="community-profile-empty">
            <span aria-hidden="true">✦</span>
            <strong>لا توجد تقييمات منشورة بعد</strong>
            <p>عندما يشارك العضو تقييمًا عامًا سيظهر هنا.</p>
          </div>
        )}

        <div className="community-profile-section-heading community-profile-section-heading--secondary">
          <div>
            <span>المناقشات</span>
            <h2>الردود المنشورة</h2>
            <p>آخر الردود العامة التي كتبها العضو على تقييمات المجتمع، مع رابط مباشر إلى سياق النقاش.</p>
          </div>
        </div>

        {contributions.replies.length ? (
          <div className="community-profile-replies">
            {contributions.replies.map((reply) => (
              <article className="community-profile-reply" key={reply.id}>
                <header>
                  <div>
                    <span>{reply.targetType === 'site' ? 'رد على تقييم للدليل' : 'رد على تقييم لمقال'}</span>
                    <Link href={reply.href}>{reply.targetLabel}</Link>
                  </div>
                  <time dateTime={reply.createdAt}>{formatFullDate(reply.createdAt)}</time>
                </header>
                <p>{reply.body}</p>
                <footer>
                  {reply.updatedAt !== reply.createdAt ? <span>تم تعديل الرد</span> : <span>رد منشور</span>}
                  <Link href={reply.href}>عرض المناقشة ←</Link>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="community-profile-empty community-profile-empty--compact">
            <span aria-hidden="true">↩</span>
            <strong>لا توجد ردود منشورة بعد</strong>
            <p>عندما يشارك العضو في مناقشة عامة سيظهر الرد هنا.</p>
          </div>
        )}
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </main>
  );
}
