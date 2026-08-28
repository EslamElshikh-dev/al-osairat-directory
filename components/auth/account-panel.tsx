'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type User = {
  localId: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  avatarUrl: string;
};

type FeatureIcon = 'heart' | 'profile' | 'add' | 'claim';

const upcomingFeatures: Array<{ title: string; description: string; icon: FeatureIcon }> = [
  {
    title: 'المفضلة',
    description: 'احفظ الأنشطة والخدمات التي تعتمد عليها وارجع لها بسرعة من حسابك.',
    icon: 'heart',
  },
  {
    title: 'بيانات العضو',
    description: 'حدّث اسمك وصورتك وبيانات حسابك الأساسية من مكان واحد.',
    icon: 'profile',
  },
  {
    title: 'طلب إضافة نشاط',
    description: 'أرسل نشاطًا محليًا جديدًا للمراجعة والإضافة إلى دليل العسيرات.',
    icon: 'add',
  },
  {
    title: 'المطالبة بملكية نشاط',
    description: 'اطلب ربط نشاط منشور بحسابك بعد مراجعة بيانات الملكية والتحقق منها.',
    icon: 'claim',
  },
];

function FeatureIcon({ type }: { type: FeatureIcon }) {
  if (type === 'heart') {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.2 5.8c-2.3-2.3-6-2.2-8.2.3-2.2-2.5-5.9-2.6-8.2-.3-2.4 2.4-2.2 6.3.3 8.7L12 21l7.9-6.5c2.5-2.4 2.7-6.3.3-8.7Z" /></svg>;
  }
  if (type === 'profile') {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.3" /><path d="M5.5 19.2c.9-3.5 3.2-5.3 6.5-5.3s5.6 1.8 6.5 5.3" /></svg>;
  }
  if (type === 'add') {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 20V8.8L12 4l7.5 4.8V20" /><path d="M8.2 20v-5.2h7.6V20M12 8.2v4M10 10.2h4" /></svg>;
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3.5 19 6v5.3c0 4.2-2.7 7.5-7 9.2-4.3-1.7-7-5-7-9.2V6l7-2.5Z" /><path d="m8.8 12 2.1 2.1 4.5-4.5" /></svg>;
}

export function AccountPanel() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

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
          <p>أرسلنا رابط التأكيد عند إنشاء الحساب. التأكيد يحمي عضويتك ويساعدنا لاحقًا في تفعيل مزايا الأعضاء بأمان.</p>
        </div>
      )}

      <section className="account-member-hub" aria-labelledby="member-hub-title">
        <div className="account-section-heading">
          <div>
            <span>مساحتك في الدليل</span>
            <h2 id="member-hub-title">مزايا العضو القادمة</h2>
          </div>
          <p>نبنيها تدريجيًا بحيث تكون كل مساهمة مرتبطة بحساب موثوق وقابلة للمراجعة.</p>
        </div>
        <div className="account-feature-grid">
          {upcomingFeatures.map((feature) => (
            <article className="account-feature-card" key={feature.title}>
              <div className="account-feature-icon"><FeatureIcon type={feature.icon} /></div>
              <div className="account-feature-copy">
                <div><h3>{feature.title}</h3><span>قريبًا</span></div>
                <p>{feature.description}</p>
              </div>
            </article>
          ))}
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
        <span>حسابك مرتبط بعضويتك فقط ولا يغيّر بيانات الدليل العامة تلقائيًا.</span>
        <button className="account-logout" type="button" onClick={logout} disabled={loggingOut}>{loggingOut ? 'جاري تسجيل الخروج…' : 'تسجيل الخروج'}</button>
      </div>
    </div>
  );
}
