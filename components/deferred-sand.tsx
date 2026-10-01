'use client';

import Image from 'next/image';
import { useEffect, useState, type ComponentType } from 'react';

type Assistant = ComponentType<{ initialPrompt?: string }>;

// Keep the assistant's chat UI out of the initial page bundle. Retain the first
// context event so opening a listing shortcut works even while the chunk loads.
export function DeferredSand() {
  const [Assistant, setAssistant] = useState<Assistant | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (Assistant) return;
    let active = true;
    const load = (event: Event) => {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail;
      setPrompt(typeof detail?.prompt === 'string' ? detail.prompt.trim().slice(0, 500) : '');
      setLoading(true);
      setFailed(false);
      void import('./sand-assistant').then((module) => {
        if (active) setAssistant(() => module.SandAssistant);
      }).catch(() => { if (active) { setLoading(false); setFailed(true); } });
    };
    window.addEventListener('sand:context', load);
    return () => { active = false; window.removeEventListener('sand:context', load); };
  }, [Assistant]);

  if (Assistant) return <Assistant initialPrompt={prompt} />;
  return <>
    <div className="sand-assistant">
      <button type="button" className="sand-trigger" data-sand-trigger="true" aria-label="افتح مساعد سَند" aria-haspopup="dialog" onClick={() => window.dispatchEvent(new CustomEvent('sand:context'))}>
        <span className="sand-avatar sand-avatar--trigger" aria-hidden="true"><Image className="sand-avatar__image" src="/images/sand-avatar-v3.webp" alt="" fill sizes="50px" /><span className="sand-avatar__status" /></span>
      </button>
    </div>
    {loading || failed ? <div className="us-sand-loading" role="status">{failed ? 'تعذر فتح سَند. اضغط عليه للمحاولة مرة ثانية.' : 'سَند جاي لك…'}</div> : null}
  </>;
}
