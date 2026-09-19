'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type TargetType = 'review' | 'reply';

type LibraryState = {
  saved: boolean;
  watching: boolean;
};

export function CommunityLibraryActions({
  targetType,
  targetId,
  authenticated,
  emailVerified,
  own = false,
}: {
  targetType: TargetType;
  targetId: string;
  authenticated: boolean;
  emailVerified: boolean;
  own?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<LibraryState>({ saved: false, watching: false });
  const [loading, setLoading] = useState(authenticated);
  const [saving, setSaving] = useState<'save' | 'watch' | ''>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authenticated) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const query = new URLSearchParams({ targetType, targetId });

    void fetch('/api/community-library?' + query.toString(), {
      cache: 'no-store',
      credentials: 'same-origin',
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as {
          saved?: boolean;
          watching?: boolean;
        };
        if (!cancelled && response.ok) {
          setState({
            saved: Boolean(payload.saved),
            watching: Boolean(payload.watching),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [authenticated, targetId, targetType]);

  async function run(kind: 'save' | 'watch') {
    if (saving || loading) return;
    if (!authenticated) {
      router.push('/account/login');
      return;
    }
    if (!emailVerified) {
      router.push('/account');
      return;
    }

    const active = kind === 'save' ? state.saved : state.watching;
    const action = kind === 'save'
      ? (active ? 'unsave' : 'save')
      : (active ? 'unwatch' : 'watch');

    setSaving(kind);
    setError('');

    try {
      const response = await fetch('/api/community-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action, targetType, targetId }),
      });
      const payload = await response.json().catch(() => ({})) as {
        saved?: boolean;
        watching?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || 'تعذر تحديث محفوظات المجتمع.');

      const next = {
        saved: Boolean(payload.saved),
        watching: Boolean(payload.watching),
      };
      setState(next);
      window.dispatchEvent(new CustomEvent('community:library-changed', {
        detail: { targetType, targetId, ...next },
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحديث محفوظات المجتمع.');
    } finally {
      setSaving('');
    }
  }

  return (
    <div className="community-library-actions" aria-label="حفظ ومتابعة المساهمة">
      <button
        type="button"
        className={state.saved ? 'is-active' : ''}
        aria-pressed={state.saved}
        onClick={() => void run('save')}
        disabled={Boolean(saving) || loading}
        title={state.saved ? 'إزالة من محفوظات المجتمع' : 'حفظ في حسابي'}
      >
        <span aria-hidden="true">{state.saved ? '★' : '☆'}</span>
        <b>{state.saved ? 'محفوظ' : 'حفظ'}</b>
      </button>

      {targetType === 'review' && !own ? (
        <button
          type="button"
          className={state.watching ? 'is-active is-watch' : 'is-watch'}
          aria-pressed={state.watching}
          onClick={() => void run('watch')}
          disabled={Boolean(saving) || loading}
          title={state.watching ? 'إيقاف متابعة النقاش' : 'إشعاري بالردود الجديدة'}
        >
          <span aria-hidden="true">{state.watching ? '◉' : '◎'}</span>
          <b>{state.watching ? 'تتابع النقاش' : 'متابعة النقاش'}</b>
        </button>
      ) : null}

      {error ? <small role="status">{error}</small> : null}
    </div>
  );
}
