'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { PublicMemberDirectoryEntry } from '@/lib/community-profiles';

type BadgeFilter = 'all' | 'active' | 'trusted';
type SortMode = 'community' | 'helpful' | 'contributions' | 'newest' | 'name';

function normalize(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function formatJoined(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-EG', { month: 'short', year: 'numeric' }).format(new Date(value));
  } catch {
    return '';
  }
}

function hasBadge(member: PublicMemberDirectoryEntry, badge: BadgeFilter) {
  if (badge === 'all') return true;
  return member.badges.some((item) => item.key === badge);
}

function communityRank(member: PublicMemberDirectoryEntry) {
  const trusted = member.badges.some((badge) => badge.key === 'trusted') ? 1 : 0;
  const active = member.badges.some((badge) => badge.key === 'active') ? 1 : 0;
  return trusted * 1_000_000
    + active * 100_000
    + member.helpfulReceived * 1_000
    + member.contributionCount * 10
    + member.likeReceived;
}

export function CommunityMembersExplorer({ members }: { members: PublicMemberDirectoryEntry[] }) {
  const [query, setQuery] = useState('');
  const [badge, setBadge] = useState<BadgeFilter>('all');
  const [sort, setSort] = useState<SortMode>('community');

  const filtered = useMemo(() => {
    const needle = normalize(query);
    return members
      .filter((member) => {
        if (!hasBadge(member, badge)) return false;
        if (!needle) return true;
        const haystack = normalize([
          member.displayName,
          member.bio,
          member.village,
          member.locality,
          ...member.badges.map((item) => item.label),
        ].filter(Boolean).join(' '));
        return haystack.includes(needle);
      })
      .sort((a, b) => {
        if (sort === 'helpful') {
          return b.helpfulReceived - a.helpfulReceived
            || b.likeReceived - a.likeReceived
            || b.contributionCount - a.contributionCount;
        }
        if (sort === 'contributions') {
          return b.contributionCount - a.contributionCount
            || b.helpfulReceived - a.helpfulReceived;
        }
        if (sort === 'newest') {
          return Date.parse(b.joinedAt) - Date.parse(a.joinedAt);
        }
        if (sort === 'name') {
          return a.displayName.localeCompare(b.displayName, 'ar');
        }
        return communityRank(b) - communityRank(a)
          || a.displayName.localeCompare(b.displayName, 'ar');
      });
  }, [badge, members, query, sort]);

  function clearFilters() {
    setQuery('');
    setBadge('all');
    setSort('community');
  }

  return (
    <div className="community-members-explorer">
      <div className="community-members-toolbar" aria-label="بحث وفرز أعضاء المجتمع">
        <label className="community-members-search">
          <span>ابحث عن عضو</span>
          <div>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="الاسم، القرية، النجع أو النبذة…"
              autoComplete="off"
            />
            {query ? (
              <button type="button" onClick={() => setQuery('')} aria-label="مسح البحث">×</button>
            ) : null}
          </div>
        </label>

        <label className="community-members-select">
          <span>الشارة</span>
          <select value={badge} onChange={(event) => setBadge(event.target.value as BadgeFilter)}>
            <option value="all">كل الأعضاء</option>
            <option value="active">عضو نشط</option>
            <option value="trusted">مساهم موثوق</option>
          </select>
        </label>

        <label className="community-members-select">
          <span>الترتيب</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
            <option value="community">الأبرز في المجتمع</option>
            <option value="helpful">الأكثر فائدة</option>
            <option value="contributions">الأكثر مساهمة</option>
            <option value="newest">الأحدث انضمامًا</option>
            <option value="name">الاسم</option>
          </select>
        </label>
      </div>

      <div className="community-members-results-meta" aria-live="polite">
        <span>يعرض <b>{filtered.length.toLocaleString('ar-EG')}</b> من {members.length.toLocaleString('ar-EG')} عضو</span>
        {(query || badge !== 'all' || sort !== 'community') ? (
          <button type="button" onClick={clearFilters}>إعادة الضبط</button>
        ) : null}
      </div>

      {filtered.length ? (
        <div className="community-members-grid">
          {filtered.map((member) => {
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
                    {member.badges.map((item) => (
                      <span className={'community-badge is-' + item.key} key={item.key}>{item.label}</span>
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
        <div className="community-members-empty community-members-empty--search">
          <span aria-hidden="true">⌕</span>
          <strong>لا توجد نتائج بهذه الفلاتر</strong>
          <p>جرّب اسمًا أقصر أو أعد ضبط الشارة والترتيب.</p>
          <button type="button" onClick={clearFilters}>عرض كل الأعضاء</button>
        </div>
      )}
    </div>
  );
}
