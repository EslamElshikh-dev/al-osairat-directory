'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CommunityReportButton } from '@/components/community-report-button';
import type {
  CommunityReactionSummary,
  CommunityReactionTarget,
} from '@/lib/community-reactions';

type ReactionKind = 'like' | 'helpful';

export function CommunityReactions({
  targetType,
  targetId,
  initial,
  authenticated,
  emailVerified,
  own = false,
}: {
  targetType: CommunityReactionTarget;
  targetId: string;
  initial: CommunityReactionSummary;
  authenticated: boolean;
  emailVerified: boolean;
  own?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [saving, setSaving] = useState<ReactionKind | ''>('');
  const [error, setError] = useState('');

  async function toggle(reaction: ReactionKind) {
    if (saving || own) return;
    if (!authenticated) {
      router.push('/account/login');
      return;
    }
    if (!emailVerified) {
      router.push('/account');
      return;
    }

    setSaving(reaction);
    setError('');
    try {
      const response = await fetch('/api/community-reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ targetType, targetId, reaction }),
      });
      const payload = await response.json() as {
        reactions?: CommunityReactionSummary;
        error?: string;
      };
      if (!response.ok || !payload.reactions) {
        throw new Error(payload.error || 'تعذر حفظ التفاعل.');
      }
      setState(payload.reactions);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذر حفظ التفاعل.');
    } finally {
      setSaving('');
    }
  }

  return (
    <div className={'community-reactions' + (own ? ' is-own' : '')}>
      <div className="community-reactions__buttons" aria-label="التفاعل مع المساهمة">
        <button
          type="button"
          className={state.liked ? 'is-active' : ''}
          aria-pressed={state.liked}
          disabled={Boolean(saving) || own}
          title={own ? 'لا يمكن التفاعل مع مساهمتك' : 'إعجاب'}
          onClick={() => void toggle('like')}
        >
          <span aria-hidden="true">{state.liked ? '♥' : '♡'}</span>
          <b>إعجاب</b>
          <small>{state.likeCount.toLocaleString('ar-EG')}</small>
        </button>
        <button
          type="button"
          className={state.helpful ? 'is-active is-helpful' : 'is-helpful'}
          aria-pressed={state.helpful}
          disabled={Boolean(saving) || own}
          title={own ? 'لا يمكن التفاعل مع مساهمتك' : 'مفيد'}
          onClick={() => void toggle('helpful')}
        >
          <span aria-hidden="true">✓</span>
          <b>مفيد</b>
          <small>{state.helpfulCount.toLocaleString('ar-EG')}</small>
        </button>
      </div>
      <CommunityReportButton
        targetType={targetType}
        targetId={targetId}
        authenticated={authenticated}
        emailVerified={emailVerified}
        own={own}
      />
      {error ? <small className="community-reactions__error" role="status">{error}</small> : null}
    </div>
  );
}
