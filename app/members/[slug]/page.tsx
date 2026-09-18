import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicMemberContributions, getPublicMemberProfileBySlug } from '@/lib/community-profiles';
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
    image: profile.avatarUrl || undefined,
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

  const contributions = await getPublicMemberContributions(profile.userId);
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
              <img src={profile.avatarUrl} alt={`صورة ${profile.displayName}`} referrerPolicy="no-referrer" />
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
          </div>

          <aside className="community-profile-stats" aria-label="مساهمات العضو">
            <span>
              <b>{contributions.reviewCount.toLocaleString('ar-EG')}</b>
              <small>تقييمات منشورة</small>
            </span>
            <span>
              <b>{contributions.replyCount.toLocaleString('ar-EG')}</b>
              <small>ردود ومشاركات</small>
            </span>
            <span>
              <b>{contributions.averageRating ? contributions.averageRating.toFixed(1) : '—'}</b>
              <small>متوسط تقييماته</small>
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
          <Link href="/directory">استكشف الدليل ←</Link>
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
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </main>
  );
}
