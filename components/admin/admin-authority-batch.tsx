'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/components/admin/admin-data-quality.module.css';

type SourceStatus = 'source_only' | 'cross_checked' | 'google_verified' | 'needs_review';
type EvidenceType = 'legacy_directory' | 'user_collected' | 'google_maps';

type AuthorityBatchItem = {
  id: string;
  slug: string;
  title: string;
  category: string;
  village: string;
  origin: string;
  phone: string | null;
  description: string | null;
  googleMapsUrl: string | null;
  googlePlaceId: string | null;
  sourceStatus: SourceStatus;
  qualityScore: number;
  authorityPriority: number;
  evidenceType: EvidenceType | null;
  evidenceLabel: string | null;
  evidenceUrl: string | null;
  evidenceCheckedAt: string | null;
};

type Draft = {
  phone: string;
  description: string;
  googleMapsUrl: string;
  googlePlaceId: string;
  sourceStatus: SourceStatus;
  evidenceType: EvidenceType;
  evidenceLabel: string;
  evidenceUrl: string;
};

function toDraft(item: AuthorityBatchItem): Draft {
  const defaultEvidence: EvidenceType = item.googleMapsUrl || item.googlePlaceId ? 'google_maps' : 'legacy_directory';
  return {
    phone: item.phone || '',
    description: item.description || '',
    googleMapsUrl: item.googleMapsUrl || '',
    googlePlaceId: item.googlePlaceId || '',
    sourceStatus: item.sourceStatus,
    evidenceType: item.evidenceType || defaultEvidence,
    evidenceLabel: item.evidenceLabel || '',
    evidenceUrl: item.evidenceUrl || item.googleMapsUrl || '',
  };
}

function statusLabel(status: SourceStatus) {
  if (status === 'google_verified') return 'Google موثق';
  if (status === 'cross_checked') return 'مراجع من أكثر من مصدر';
  if (status === 'needs_review') return 'يحتاج مراجعة';
  return 'مصدر أساسي فقط';
}

function gaps(item: AuthorityBatchItem) {
  const values: string[] = [];
  if (item.sourceStatus === 'needs_review') values.push('المصدر');
  if (!item.googleMapsUrl) values.push('Maps');
  if (!item.googlePlaceId) values.push('Place ID');
  if (!item.phone) values.push('الهاتف');
  if (!item.description) values.push('الوصف');
  return values;
}

export function AdminAuthorityBatch() {
  const router = useRouter();
  const [items, setItems] = useState<AuthorityBatchItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selected = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId]);

  const load = useCallback(async (keepSelection = true) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/authority-batch', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'تعذر تحميل الدفعة.');
      const nextItems = Array.isArray(payload.items) ? payload.items as AuthorityBatchItem[] : [];
      setItems(nextItems);
      if (keepSelection && selectedId) {
        const refreshed = nextItems.find((item) => item.id === selectedId);
        if (refreshed) setDraft(toDraft(refreshed));
        else {
          setSelectedId(null);
          setDraft(null);
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل Authority Batch #1.');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function selectItem(item: AuthorityBatchItem) {
    setSelectedId(item.id);
    setDraft(toDraft(item));
    setMessage('');
    setError('');
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft || saving) return;
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/admin/authority-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, ...draft }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'تعذر حفظ المراجعة.');
      const quality = Number(payload.result?.qualityScore || 0);
      const priority = Number(payload.result?.authorityPriority || 0);
      setMessage(`تم الحفظ · الجودة ${quality.toLocaleString('ar-EG')}/100 · الأولوية ${priority.toLocaleString('ar-EG')}`);
      await load(true);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ المراجعة.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.batch} aria-labelledby="authority-batch-title">
      <div className={styles.queueHead}>
        <div>
          <span>Authority Batch #1</span>
          <h3 id="authority-batch-title">معالجة أول 20 سجلًا حسب الأثر</h3>
        </div>
        <small>الحفظ يحدّث السجل المركزي + Override دائم + دليل التحقق</small>
      </div>

      {loading && !items.length ? <p className={styles.empty}>جاري تحميل أول 20 سجلًا…</p> : null}
      {error && !items.length ? <p className={styles.batchError}>{error}</p> : null}

      <div className={styles.batchLayout}>
        <div className={styles.batchList}>
          {items.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={`${styles.batchItem} ${selectedId === item.id ? styles.batchItemActive : ''}`}
              onClick={() => selectItem(item)}
            >
              <span className={styles.batchRank}>{(index + 1).toLocaleString('ar-EG')}</span>
              <span className={styles.batchIdentity}>
                <strong>{item.title}</strong>
                <small>{item.village} · {statusLabel(item.sourceStatus)}</small>
                <span className={styles.gaps}>{gaps(item).map((gap) => <i key={gap}>{gap}</i>)}</span>
              </span>
              <span className={styles.batchScore}><b>{item.authorityPriority.toLocaleString('ar-EG')}</b><small>{item.qualityScore.toLocaleString('ar-EG')}/100</small></span>
            </button>
          ))}
        </div>

        <div className={styles.batchEditor}>
          {!selected || !draft ? (
            <div className={styles.batchPlaceholder}>
              <strong>اختر سجلًا من القائمة</strong>
              <p>راجع بياناته وأضف مصدر الإثبات ثم احفظ. بعد الحفظ يعاد حساب الجودة والأولوية تلقائيًا.</p>
            </div>
          ) : (
            <form onSubmit={save} className={styles.batchForm}>
              <div className={styles.batchEditorHead}>
                <div><span>{selected.village}</span><h4>{selected.title}</h4></div>
                <a href={`/listing/${encodeURIComponent(selected.slug)}`} target="_blank" rel="noreferrer">فتح السجل ↗</a>
              </div>

              <div className={styles.formGrid}>
                <label><span>رقم الهاتف</span><input value={draft.phone} onChange={(event) => update('phone', event.target.value)} placeholder="01xxxxxxxxx" /></label>
                <label><span>Google Place ID</span><input value={draft.googlePlaceId} onChange={(event) => update('googlePlaceId', event.target.value)} placeholder="ChIJ…" dir="ltr" /></label>
                <label className={styles.formWide}><span>رابط Google Maps</span><input value={draft.googleMapsUrl} onChange={(event) => update('googleMapsUrl', event.target.value)} placeholder="https://maps.google.com/…" dir="ltr" /></label>
                <label className={styles.formWide}><span>الوصف</span><textarea value={draft.description} onChange={(event) => update('description', event.target.value)} rows={4} placeholder="وصف واقعي مختصر يوضح النشاط أو التخصص والموقع…" /></label>
                <label><span>حالة التحقق</span><select value={draft.sourceStatus} onChange={(event) => update('sourceStatus', event.target.value as SourceStatus)}><option value="source_only">مصدر أساسي فقط</option><option value="cross_checked">مراجع من أكثر من مصدر</option><option value="google_verified">Google موثق</option><option value="needs_review">يحتاج مراجعة</option></select></label>
                <label><span>نوع مصدر الإثبات</span><select value={draft.evidenceType} onChange={(event) => update('evidenceType', event.target.value as EvidenceType)}><option value="legacy_directory">بيانات الدليل</option><option value="user_collected">مصدر محلي / مباشر</option><option value="google_maps">Google Maps</option></select></label>
                <label className={styles.formWide}><span>وصف مصدر الإثبات</span><input value={draft.evidenceLabel} onChange={(event) => update('evidenceLabel', event.target.value)} placeholder="مثال: صفحة النشاط على Google Maps أو تواصل مباشر مع صاحب النشاط" /></label>
                <label className={styles.formWide}><span>رابط مصدر الإثبات — اختياري للمصدر المحلي</span><input value={draft.evidenceUrl} onChange={(event) => update('evidenceUrl', event.target.value)} placeholder="https://…" dir="ltr" /></label>
              </div>

              {error ? <p className={styles.batchError}>{error}</p> : null}
              {message ? <p className={styles.batchSuccess}>{message}</p> : null}

              <div className={styles.batchActions}>
                <button type="submit" className="button button--primary" disabled={saving}>{saving ? 'جاري الحفظ…' : 'حفظ وإعادة حساب الجودة'}</button>
                <button type="button" className="button button--ghost" onClick={() => setDraft(toDraft(selected))} disabled={saving}>إلغاء التغييرات</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
