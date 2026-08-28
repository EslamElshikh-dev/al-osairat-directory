'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MemberProfileForm } from './member-profile-form';
import { BusinessSubmissionPanel } from './business-submission-panel';

type User = {
  localId: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  avatarUrl: string;
};

type FavoriteItem = {
  listingId: string;
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  location: string;
  village: string;
  createdAt: string;
};

function ClaimIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3.5 19 6v5.3c0 4.2-2.7 7.5-7 9.2-4.3-1.7-7-5-7-9.2V6l7-2.5Z" /><path d="m8.8 12 2.1 2.1 4.5-4.5" /></svg>;
}

function HeartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.2 5.8c-2.3-2.3-6-2.2-8.2.3-2.2-2.5-5.9-2.6-8.2-.3-2.4 2.4-2.2 6.3.3 8.7L12 21l7.9-6.5c2.5-2.4 2.7-6.3.3-8.7Z" /></svg>;
}

export function AccountPanel() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [removingFavorite, setRemovingFavorite] = useState('');

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.json())
      .then((data) => {
        if (!data.user) router.replace('/account/login');
        else setUser(data.user);
      })
      .catch(() => router.replace('/account/login'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setFavoritesLoading(true);
    fetch('/api/favorites?include=items', { cache: 'no-store', credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : { items: [] })
      .then((data) => { if (active) setFavorites(data.items || []); })
      .catch(() => { if (active) setFavorites([]); })
      .finally(() => { if (active) setFavoritesLoading(false); });
    return () => { active = false; };
  }, [user?.localId]);

  async function removeFavorite(listingId: string) {
    if (removingFavorite) return;
    setRemovingFavorite(listingId);
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ listingId, action: 'remove' }),
      });
      if (!response.ok) throw new Error('REMOVE_FAILED');
      setFavorites((items) => items.filter((item) => item.listingId !== listingId));
      window.dispatchEvent(new CustomEvent('favorites:changed', { detail: { listingId, favorite: false } }));
    } catch {
      // Keep the item visible so the member can retry.
    } finally {
      setRemovingFavorite('');
    }
  }

  async function logout() {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => null);
    router.replace('/');
    router.refresh();
  }

  if (loading) return <div className="account-loading" aria-live="polite"><span /><p>جاري تحميل حسابك…</p></div>;
  if (!user) return null;

  const initial = user.displayName.trim().charAt(0) || 'ع';

  return (
    <div className="account-dashboard account-dashboard--upgraded">
      <section className="account-profile-card account-profile-card--upgraded">
        <div className={`account-avatar${user.avatarUrl ? ' has-photo' : ''}`}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={`صورة ${user.displayName}`} referrerPolicy="no-referrer" />
          ) : (
            <span aria-hidden="true">{initial}</span>
          )}
        </div>
        <div className="account-profile-copy">
          <span className="account-kicker">عضو دليل العسيرات</span>
          <h1>{user.displayName}</h1>
          <p>{user.email}</p>
          <div className="account-profile-badges">
            <span className={`account-status${user.emailVerified ? ' is-verified' : ''}`}>
              <i aria-hidden="true" />
              {user.emailVerified ? 'البريد الإلكتروني مؤكد' : 'البريد الإلكتروني يحتاج تأكيد'}
            </span>
            {user.avatarUrl && <span className="account-google-badge"><b aria-hidden="true">G</b> حساب Google متصل</span>}
          </div>
        </div>
      </section>

      {!user.emailVerified && (
        <div className="account-notice">
          <strong>أكد بريدك الإلكتروني</strong>
          <p>أرسلنا رابط التأكيد عند إنشاء الحساب. التأكيد يحمي عضويتك ويساعدنا في تفعيل إرسال الأنشطة والمزايا المرتبطة بالعضوية بأمان.</p>
        </div>
      )}

      <MemberProfileForm
        onSaved={(profile) => {
          setUser((current) => current ? { ...current, displayName: profile.fullName, avatarUrl: profile.avatarUrl || current.avatarUrl } : current);
        }}
      />

      <BusinessSubmissionPanel />

      <section className="account-favorites-card" aria-labelledby="favorites-title">
        <div className="account-favorites-heading">
          <div>
            <span>ميزة العضو</span>
            <h2 id="favorites-title">مفضلتي</h2>
          </div>
          <span className="account-favorites-count">{favoritesLoading ? 'جاري التحميل' : `${favorites.length} محفوظ`}</span>
        </div>

        {favoritesLoading ? (
          <div className="account-favorites-loading">جاري تحميل العناصر المحفوظة…</div>
        ) : favorites.length ? (
          <div className="account-favorites-list">
            {favorites.map((item) => (
              <article className="account-favorite-item" key={item.listingId}>
                <div className="account-favorite-main">
                  <div>
                    <Link href={`/listing/${item.slug}`}>{item.title}</Link>
                    <span className="account-favorite-category">{item.categoryLabel}</span>
                  </div>
                  <p>{item.location} · {item.village}</p>
                </div>
                <div className="account-favorite-actions">
                  <Link className="account-favorite-open" href={`/listing/${item.slug}`}>عرض التفاصيل</Link>
                  <button
                    className="account-favorite-remove"
                    type="button"
                    onClick={() => removeFavorite(item.listingId)}
                    disabled={removingFavorite === item.listingId}
                  >
                    {removingFavorite === item.listingId ? 'جاري الإزالة…' : 'إزالة'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="account-favorites-empty">
            <HeartIcon />
            <strong>مفضلتك فاضية حاليًا</strong>
            <p>اضغط علامة القلب على أي نشاط أو خدمة في الدليل، وهتلاقيها محفوظة هنا تلقائيًا في حسابك.</p>
            <Link href="/directory">استكشف الدليل وأضف أول مفضلة ←</Link>
          </div>
        )}
      </section>

      <section className="account-member-hub" aria-labelledby="member-hub-title">
        <div className="account-section-heading">
          <div>
            <span>المرحلة التالية</span>
            <h2 id="member-hub-title">المطالبة بملكية نشاط</h2>
          </div>
          <p>بعد تفعيل المفضلة وبيانات العضو وطلبات الإضافة، يتبقى ربط الأنشطة المنشورة بأصحابها عبر مسار تحقق منفصل.</p>
        </div>
        <div className="account-feature-grid account-feature-grid--single">
          <article className="account-feature-card">
            <div className="account-feature-icon"><ClaimIcon /></div>
            <div className="account-feature-copy">
              <div><h3>المطالبة بملكية نشاط</h3><span>قريبًا</span></div>
              <p>اطلب ربط نشاط منشور بحسابك بعد مراجعة بيانات الملكية والتحقق منها.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="account-actions-card">
        <div><span>اختصارات العضو</span><h2>واصل استكشاف العسيرات</h2></div>
        <div className="account-quick-links">
          <Link href="/directory">استكشف الدليل <b aria-hidden="true">←</b></Link>
          <Link href="/villages">دليل القرى <b aria-hidden="true">←</b></Link>
          <Link href="/blog">مدونة العسيرات <b aria-hidden="true">←</b></Link>
        </div>
      </section>

      <div className="account-footer-actions">
        <span>طلبات إضافة الأنشطة تخضع للمراجعة ولا تغيّر بيانات الدليل العامة تلقائيًا.</span>
        <button className="account-logout" type="button" onClick={logout} disabled={loggingOut}>{loggingOut ? 'جاري تسجيل الخروج…' : 'تسجيل الخروج'}</button>
      </div>
    </div>
  );
}
