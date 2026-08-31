'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

type ClaimStatus = 'pending' | 'needs_changes' | 'approved' | 'rejected';
type Relationship = 'owner' | 'manager' | 'authorized_representative';
type ProofMethod = 'listing_phone' | 'google_business_profile' | 'official_document' | 'other';

type ClaimableListing = {
  id: string;
  slug: string;
  title: string;
  categoryLabel: string;
  village: string;
  location: string;
  hasPhone: boolean;
};

type Claim = {
  id: string;
  listingId: string;
  listing: null | {
    slug: string;
    title: string;
    categoryLabel: string;
    village: string;
    location: string;
  };
  relationship: Relationship;
  phone: string;
  proofMethod: ProofMethod;
  proofDetails: string;
  status: ClaimStatus;
  reviewNote: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};

const statusInfo: Record<ClaimStatus, { label: string; hint: string }> = {
  pending: { label: 'قيد المراجعة', hint: 'وصلت المطالبة وسيتم التحقق من صلتك بالنشاط قبل اعتمادها.' },
  needs_changes: { label: 'يحتاج استكمال', hint: 'نحتاج معلومة أو إثباتًا إضافيًا قبل إكمال المراجعة.' },
  approved: { label: 'مقبولة', hint: 'تم قبول إثبات الملكية بعد المراجعة.' },
  rejected: { label: 'غير مقبولة', hint: 'تعذر اعتماد المطالبة بصورتها الحالية.' },
};

const relationshipLabels: Record<Relationship, string> = {
  owner: 'مالك النشاط',
  manager: 'مدير النشاط',
  authorized_representative: 'مفوّض عن صاحب النشاط',
};

const proofLabels: Record<ProofMethod, string> = {
  listing_phone: 'التأكيد عبر رقم الهاتف المنشور',
  google_business_profile: 'ملكية ملف Google التجاري',
  official_document: 'مستند رسمي مرتبط بالنشاط',
  other: 'طريقة إثبات أخرى',
};

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5 19 6v5.3c0 4.2-2.7 7.5-7 9.2-4.3-1.7-7-5-7-9.2V6l7-2.5Z" />
      <path d="m8.8 12 2.1 2.1 4.5-4.5" />
    </svg>
  );
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.8" /><path d="m14.9 14.9 4 4" /></svg>;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
  } catch {
    return '';
  }
}

export function OwnershipClaimPanel() {
  const [listings, setListings] = useState<ClaimableListing[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [relationship, setRelationship] = useState<Relationship | ''>('');
  const [phone, setPhone] = useState('');
  const [proofMethod, setProofMethod] = useState<ProofMethod | ''>('');
  const [proofDetails, setProofDetails] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/ownership-claims', { cache: 'no-store', credentials: 'same-origin' })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error('CLAIMS_LOAD_FAILED'))),
      fetch('/api/profile', { cache: 'no-store', credentials: 'same-origin' })
        .then((response) => response.ok ? response.json() : { profile: null }),
    ])
      .then(([claimData, profileData]) => {
        if (!active) return;
        const nextListings = (claimData.listings || []) as ClaimableListing[];
        setListings(nextListings);
        setClaims(claimData.claims || []);
        if (profileData.profile?.phone) setPhone(profileData.profile.phone);

        const requestedClaimId = new URLSearchParams(window.location.search).get('claim') || '';
        const requestedListing = requestedClaimId ? nextListings.find((listing) => listing.id === requestedClaimId) : null;
        if (requestedListing) {
          setSelectedId(requestedListing.id);
          setQuery(requestedListing.title);
          setMessage('تم اختيار هذا النشاط مباشرة من صفحة السجل. أكمل بيانات الإثبات لإرسال مطالبة الملكية.');
        }
      })
      .catch(() => { if (active) setError('تعذر تحميل بيانات المطالبة الآن. حدّث الصفحة وحاول مرة أخرى.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const selectedListing = useMemo(
    () => listings.find((listing) => listing.id === selectedId) || null,
    [listings, selectedId],
  );

  const filteredListings = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return listings
      .filter((listing) => `${listing.title} ${listing.categoryLabel} ${listing.village} ${listing.location}`.toLowerCase().includes(normalized))
      .slice(0, 8);
  }, [listings, query]);

  function chooseListing(listing: ClaimableListing) {
    setSelectedId(listing.id);
    setQuery(listing.title);
    if (!listing.hasPhone && proofMethod === 'listing_phone') setProofMethod('');
    setError('');
    setMessage('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/ownership-claims', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ listingId: selectedId, relationship, phone, proofMethod, proofDetails }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر إرسال مطالبة الملكية الآن.');

      setClaims((items) => [data.claim as Claim, ...items]);
      setSelectedId('');
      setQuery('');
      setRelationship('');
      setProofMethod('');
      setProofDetails('');
      setMessage('أُرسلت مطالبة الملكية للمراجعة بنجاح، ولن تُعتمد الملكية قبل التحقق.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إرسال مطالبة الملكية الآن.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ownership-claim-panel" aria-labelledby="ownership-claim-title">
      <div className="ownership-claim-heading">
        <div className="ownership-claim-heading__icon"><ShieldIcon /></div>
        <div>
          <span>ميزة العضو</span>
          <h2 id="ownership-claim-title">المطالبة بملكية نشاط</h2>
          <p>اختر نشاطًا منشورًا في الدليل وأرسل بيانات تساعدنا على التحقق من علاقتك به قبل اعتماد المطالبة.</p>
        </div>
        <span className="ownership-claim-live">متاح الآن</span>
      </div>

      <form className="ownership-claim-form" onSubmit={submit}>
        <div className="ownership-search-block">
          <label htmlFor="ownership-listing-search">ابحث عن النشاط المنشور <b>*</b></label>
          <div className="ownership-search-input">
            <SearchIcon />
            <input
              id="ownership-listing-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (selectedId) setSelectedId('');
                setError('');
                setMessage('');
              }}
              placeholder="اكتب اسم النشاط أو القرية أو القسم"
              autoComplete="off"
              disabled={loading}
            />
          </div>

          {!selectedId && query.trim() && (
            <div className="ownership-search-results" role="listbox" aria-label="نتائج البحث عن النشاط">
              {filteredListings.length ? filteredListings.map((listing) => (
                <button type="button" key={listing.id} onClick={() => chooseListing(listing)}>
                  <strong>{listing.title}</strong>
                  <span>{listing.categoryLabel} · {listing.village}</span>
                  <small>{listing.location}</small>
                </button>
              )) : <div className="ownership-search-empty">لم نجد نشاطًا مطابقًا. جرّب جزءًا آخر من الاسم أو اسم القرية.</div>}
            </div>
          )}

          {selectedListing && (
            <div className="ownership-selected-listing">
              <div>
                <span>النشاط المختار</span>
                <strong>{selectedListing.title}</strong>
                <p>{selectedListing.categoryLabel} · {selectedListing.village} · {selectedListing.location}</p>
              </div>
              <div className="ownership-selected-actions">
                <Link href={`/listing/${selectedListing.slug}`} target="_blank">عرض السجل</Link>
                <button type="button" onClick={() => { setSelectedId(''); setQuery(''); }}>تغيير</button>
              </div>
            </div>
          )}
        </div>

        <div className="ownership-claim-grid">
          <label>
            <span>صفتك بالنسبة للنشاط <b>*</b></span>
            <select value={relationship} onChange={(event) => setRelationship(event.target.value as Relationship | '')} required>
              <option value="">اختر الصفة</option>
              <option value="owner">مالك النشاط</option>
              <option value="manager">مدير النشاط</option>
              <option value="authorized_representative">مفوّض عن صاحب النشاط</option>
            </select>
          </label>

          <label>
            <span>رقم التواصل <b>*</b></span>
            <input dir="ltr" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={32} placeholder="01xxxxxxxxx" required />
          </label>

          <label className="ownership-field--wide">
            <span>طريقة إثبات الملكية <b>*</b></span>
            <select value={proofMethod} onChange={(event) => setProofMethod(event.target.value as ProofMethod | '')} required>
              <option value="">اختر طريقة الإثبات</option>
              <option value="listing_phone" disabled={Boolean(selectedListing && !selectedListing.hasPhone)}>التأكيد عبر رقم الهاتف المنشور بالنشاط</option>
              <option value="google_business_profile">ملكية ملف Google التجاري</option>
              <option value="official_document">مستند رسمي مرتبط بالنشاط</option>
              <option value="other">طريقة إثبات أخرى</option>
            </select>
            {selectedListing && !selectedListing.hasPhone && <small>هذا السجل لا يحتوي رقم هاتف منشورًا، لذلك اختر طريقة إثبات أخرى.</small>}
          </label>

          <label className="ownership-field--wide">
            <span>تفاصيل الإثبات <b>*</b></span>
            <textarea
              value={proofDetails}
              onChange={(event) => setProofDetails(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="اشرح باختصار كيف يمكن التحقق من ملكيتك أو صفتك. إذا اخترت مستندًا رسميًا، اذكر نوع المستند المتاح دون إرسال بيانات حساسة هنا."
              required
            />
            <small>{proofDetails.length}/1000</small>
          </label>
        </div>

        <div className="ownership-claim-note">
          <strong>الملكية لا تُمنح تلقائيًا</strong>
          <p>سنراجع النشاط ووسيلة الإثبات أولًا. لا ترسل كلمات مرور أو رموز تحقق أو صور هويات أو مستندات حساسة داخل خانة التفاصيل.</p>
        </div>

        {error && <div className="ownership-claim-feedback is-error" role="alert">{error}</div>}
        {message && <div className="ownership-claim-feedback is-success" role="status">{message}</div>}

        <div className="ownership-claim-submit-row">
          <span>{selectedListing ? `سترسل المطالبة على: ${selectedListing.title}` : 'اختر نشاطًا من نتائج البحث أولًا.'}</span>
          <button type="submit" disabled={saving || !selectedId}>{saving ? 'جارٍ إرسال المطالبة…' : 'إرسال مطالبة الملكية'}</button>
        </div>
      </form>

      <div className="ownership-claims-history" aria-labelledby="ownership-history-title">
        <div className="ownership-history-heading">
          <div><span>متابعة المطالبات</span><h3 id="ownership-history-title">مطالباتي</h3></div>
          <span>{loading ? '...' : claims.length}</span>
        </div>

        {loading ? (
          <div className="ownership-history-empty">جارٍ تحميل مطالباتك…</div>
        ) : claims.length ? (
          <div className="ownership-history-list">
            {claims.map((claim) => {
              const status = statusInfo[claim.status];
              return (
                <article className="ownership-history-item" key={claim.id}>
                  <div className="ownership-history-main">
                    <div className="ownership-history-title">
                      <h4>{claim.listing?.title || 'نشاط من الدليل'}</h4>
                      <span className={`submission-status submission-status--${claim.status}`}>{status.label}</span>
                    </div>
                    {claim.listing && <p>{claim.listing.categoryLabel} · {claim.listing.village}</p>}
                    <small>{relationshipLabels[claim.relationship]} · {proofLabels[claim.proofMethod]}</small>
                    <div className="ownership-status-hint">{status.hint}</div>
                    {claim.reviewNote && <div className="submission-review-note"><strong>ملاحظة المراجعة:</strong> {claim.reviewNote}</div>}
                  </div>
                  <div className="ownership-history-meta">
                    {claim.listing && <Link href={`/listing/${claim.listing.slug}`}>عرض النشاط</Link>}
                    <span>أُرسلت {formatDate(claim.createdAt)}</span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="ownership-history-empty">
            <strong>لا توجد مطالبات ملكية حتى الآن</strong>
            <p>ابحث عن نشاطك بالأعلى، اختره، ثم أرسل طريقة التحقق المناسبة.</p>
          </div>
        )}
      </div>
    </section>
  );
}
