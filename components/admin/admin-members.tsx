'use client';

import { useCallback, useEffect, useState } from 'react';

type Member = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  verified: boolean;
  avatarUrl: string | null;
  village: string | null;
};

function joinedAt(value: string) {
  return new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Cairo',
  }).format(new Date(value));
}

export function AdminMembers() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/members', { cache: 'no-store', credentials: 'same-origin' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'تعذر تحميل الحسابات.');
      setMembers(payload.members);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل الحسابات.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <section id="admin-members" className="admin-live-panel" aria-labelledby="admin-members-title">
    <header className="admin-live-panel__head"><div><span>عضوية الدليل</span><h2 id="admin-members-title">كل الحسابات المسجلة</h2><p>الحساب المسجل يظهر هنا حتى لو لم ينشر نشاطًا أو يدخل الدليل مؤخرًا.</p></div><button type="button" onClick={() => void load()} disabled={loading}>تحديث</button></header>
    {error && <p role="alert" className="admin-live-panel__error">{error}</p>}
    {loading && !members ? <p>جارٍ تحميل الحسابات…</p> : members?.length ? <>
      <p className="admin-live-panel__total"><strong>{members.length.toLocaleString('ar-EG')}</strong> حسابات مسجلة</p>
      <div className="admin-members-grid">{members.map((member) => <article key={member.id} className="admin-member-card">
        <span className="admin-member-card__avatar" aria-hidden="true">{member.name.trim().charAt(0) || 'ع'}</span>
        <div className="admin-member-card__info"><strong>{member.name}</strong><a href={`mailto:${member.email}`} dir="ltr">{member.email}</a><small>انضم {joinedAt(member.createdAt)}{member.village ? ` · ${member.village}` : ''}</small></div>
        <span className={member.verified ? 'is-verified' : 'is-pending'}>{member.verified ? 'مؤكد' : 'بانتظار تأكيد البريد'}</span>
      </article>)}</div>
    </> : !loading && !error ? <p>لا توجد حسابات مسجلة بعد.</p> : null}
  </section>;
}
