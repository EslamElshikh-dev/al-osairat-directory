'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { SandApiResponse, SandResult } from '@/lib/sand/types';

type ChatEntry = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  payload?: SandApiResponse;
};

const welcome: ChatEntry = {
  id: 'sand-welcome',
  role: 'assistant',
  text: 'أهلًا يا طيب، أنا سَند؛ مساعدك الآلي في دليل العسيرات. أقدر أدلّك على طبيب، صيدلية، محل، حِرفي، مواصلات أو رقم طوارئ. قولّي الخدمة واسم القرية وأنا حاضر.',
};

const starterSuggestions = [
  'دكتور في أولاد حمزة',
  'صيدلية قريبة',
  'محامي في العسيرات',
  'مواصلات العسيرات',
  'أرقام الطوارئ',
  'مين صمم الموقع؟',
];

function SandAvatar({ variant }: { variant: 'header' | 'trigger' }) {
  return (
    <span className={`sand-avatar sand-avatar--${variant}`} aria-hidden="true">
      <Image
        src="/images/sand-avatar-v3.webp"
        alt=""
        fill
        sizes={variant === 'trigger' ? '68px' : '58px'}
        className="sand-avatar__image"
        priority
      />
      <span className="sand-avatar__status" />
    </span>
  );
}

function safePhoneHref(phone?: string) {
  if (!phone) return '';
  const value = phone.replace(/[^\d+]/g, '');
  return /^\+?\d{3,15}$/.test(value) ? `tel:${value}` : '';
}

function ResultCard({ result }: { result: SandResult }) {
  const href = result.href.startsWith('/listing/') ? result.href : '/directory';
  const phone = safePhoneHref(result.phone);

  return (
    <article className="sand-result">
      <div className="sand-result__head">
        <span>{result.categoryLabel}</span>
        <small>{result.sourceLabel}</small>
      </div>
      <strong>{result.title}</strong>
      <p>{[result.village, result.location].filter(Boolean).join(' · ')}</p>
      {result.hours ? <small className="sand-result__hours">المواعيد: {result.hours}</small> : null}
      <div className="sand-result__actions">
        <Link href={href}>التفاصيل</Link>
        {phone ? <a href={phone}>اتصال</a> : null}
      </div>
    </article>
  );
}

function sourceLabel(payload?: SandApiResponse) {
  if (!payload) return '';
  if (payload.dataSource === 'supabase') return 'بيانات الدليل الحية';
  if (payload.dataSource === 'local_snapshot') return 'نسخة الدليل المحلية';
  if (payload.dataSource === 'static_emergency') return 'أرقام طوارئ ثابتة';
  return '';
}

export function SandAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatEntry[]>([welcome]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

  const latestPayload = useMemo(
    () => [...messages].reverse().find((message) => message.payload)?.payload,
    [messages],
  );
  const suggestions = useMemo(
    () => [...new Set([...(latestPayload?.suggestions || []), ...starterSuggestions])].slice(0, 6),
    [latestPayload],
  );

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80);
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [loading, messages, open]);

  async function send(raw: string) {
    const text = raw.trim().slice(0, 500);
    if (text.length < 2 || loading) return;

    const userEntry: ChatEntry = { id: crypto.randomUUID(), role: 'user', text };
    const history = messages.slice(-6).map((message) => ({ role: message.role, text: message.text }));
    setMessages((current) => [...current, userEntry]);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/sand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ message: text, history }),
      });
      const data = await response.json().catch(() => ({})) as Partial<SandApiResponse> & { error?: string };
      if (!response.ok || !data.message) throw new Error(data.error || 'تعذر الوصول إلى سَند الآن.');

      const payload = data as SandApiResponse;
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: payload.message,
        payload,
      }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر الوصول إلى سَند الآن.');
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send(input);
    }
  }

  return (
    <div className={`sand-assistant${open ? ' is-open' : ''}`}>
      {open ? (
        <section id="sand-panel" className="sand-panel" role="dialog" aria-modal="false" aria-labelledby="sand-title">
          <header className="sand-panel__header">
            <SandAvatar variant="header" />
            <div className="sand-panel__identity">
              <strong id="sand-title">سَند</strong>
              <small><i /> مساعدك المحلي من بيانات الدليل</small>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="تصغير سَند">×</button>
          </header>

          <div className="sand-emergency-bar" aria-label="أرقام الطوارئ الأساسية">
            <span>خطر مباشر؟</span>
            <a href="tel:123">إسعاف 123</a>
            <a href="tel:122">نجدة 122</a>
            <a href="tel:180">مطافئ 180</a>
          </div>

          <div ref={feedRef} className="sand-feed" aria-live="polite" aria-busy={loading}>
            {messages.map((message) => (
              <div key={message.id} className={`sand-message sand-message--${message.role}`}>
                <div className="sand-message__bubble">{message.text}</div>
                {message.payload?.results?.length ? (
                  <div className="sand-results">
                    {message.payload.results.map((result) => <ResultCard key={result.id} result={result} />)}
                  </div>
                ) : null}
                {message.payload ? (
                  <div className="sand-message__meta">
                    <span>{sourceLabel(message.payload)}</span>
                    <small>{message.payload.disclosure}</small>
                  </div>
                ) : null}
              </div>
            ))}

            {loading ? (
              <div className="sand-message sand-message--assistant">
                <div className="sand-typing" aria-label="سَند يبحث في الدليل"><span /><span /><span /></div>
              </div>
            ) : null}
            {error ? <div className="sand-error" role="alert">{error}</div> : null}
          </div>

          <div className="sand-suggestions" aria-label="اقتراحات سريعة">
            <span className="sand-suggestions__label">جرّب تسأل عن</span>
            <div className="sand-suggestions__list">
              {suggestions.map((suggestion) => (
                <button key={suggestion} type="button" disabled={loading} onClick={() => void send(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <form className="sand-composer" onSubmit={submit}>
            <label className="sr-only" htmlFor="sand-input">اكتب سؤالك لسَند</label>
            <textarea
              ref={inputRef}
              id="sand-input"
              rows={1}
              maxLength={500}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="مثال: عايز صيدلية في أولاد حمزة"
              disabled={loading}
            />
            <button type="submit" disabled={loading || input.trim().length < 2} aria-label="إرسال الرسالة">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m4 12 16-8-6.5 16-2.2-6.1L4 12Z" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
          <p className="sand-privacy">لا تُرسل كلمات مرور أو بيانات شخصية حساسة. المحادثة لا تُحفظ في حسابك.</p>
        </section>
      ) : null}

      {!open ? (
        <button
          type="button"
          className="sand-trigger"
          aria-label="افتح مساعد سَند"
          aria-controls="sand-panel"
          aria-haspopup="dialog"
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          <span className="sand-invite" aria-hidden="true">هلا أباشا أومرني</span>
          <SandAvatar variant="trigger" />
        </button>
      ) : null}
    </div>
  );
}
