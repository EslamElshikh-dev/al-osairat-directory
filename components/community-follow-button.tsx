'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type FollowState = {
  authenticated: boolean;
  emailVerified: boolean;
  own: boolean;
  following: boolean;
  followerCount: number;
};

export function CommunityFollowButton({
  slug,
  initialFollowerCount,
}: {
  slug: string;
  initialFollowerCount: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<FollowState>({
    authenticated: false,
    emailVerified: false,
    own: false,
    following: false,
    followerCount: initialFollowerCount,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/community-follows?slug=' + encodeURIComponent(slug), {
      cache: 'no-store',
      credentials: 'same-origin',
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as FollowState | null;
        if (!cancelled && response.ok && payload) setState(payload);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  async function toggle() {
    if (saving || state.own) return;
    if (!state.authenticated) {
      router.push('/account/login');
      return;
    }
    if (!state.emailVerified) {
      router.push('/account');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/community-follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ slug }),
      });
      const payload = await response.json().catch(() => ({})) as {
        following?: boolean;
        followerCount?: number;
        error?: string;
      };
      if (!response.ok || typeof payload.following !== 'boolean') {
        throw new Error(payload.error || 'تعذر تحديث المتابعة.');
      }
      setState((current) => ({
        ...current,
        following: Boolean(payload.following),
        followerCount: Number(payload.followerCount ?? current.followerCount),
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحديث المتابعة.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="community-follow">
      <div className="community-follow__count" aria-label="عدد المتابعين">
        <b>{state.followerCount.toLocaleString('ar-EG')}</b>
        <span>متابع</span>
      </div>
      {state.own ? (
        <span className="community-follow__own">هذه صفحتك العامة</span>
      ) : (
        <button
          type="button"
          className={state.following ? 'is-following' : ''}
          onClick={() => void toggle()}
          disabled={saving || loading}
          aria-pressed={state.following}
        >
          {saving ? 'جارٍ التحديث…' : state.following ? '✓ تتابعه' : '+ متابعة'}
        </button>
      )}
      {error ? <small role="status">{error}</small> : null}
    </div>
  );
}
