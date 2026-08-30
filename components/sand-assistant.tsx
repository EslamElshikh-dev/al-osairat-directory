'use client';

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
  text: 'أهلًا يا طيب، أنا سَند؛ مساعد آلي لدليل العسيرات. قولّي بتدور على خدمة إيه وفي أي قرية؟',
};

const starterSuggestions = ['دكتور في أولاد حمزة', 'صيدلية قريبة', 'مواصلات العسيرات'];

function SandIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M8.2 19.6c2.1 4.2 6.4 6.4 10.8 5.3 4.8-1.2 7.8-6 6.6-10.8C24.4 9.3 19.7 6.3 15 7.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6.2 14.2 15 7.4l-.5 11.1-8.3-4.3Z" fill="currentColor" opacity=".94" />
      <circle cx="19.8" cy="15.7" r="1.5" fill="currentColor" />
    </svg>
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
  const suggestions = latestPayload?.suggestions?.length ? latestPayload.suggestions : starterSuggestions;

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
        <section className="sand-panel" role="dialog" aria-modal="false" aria-labelledby="sand-title">
          <header className="sand-panel__header">
            <span className="sand-panel__avatar"><SandIcon /></span>
            <div>
              <strong id="sand-title">سَند</strong>
              <small>مساعد دليل العسيرات الآلي</small>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="تصغير سَند">−</button>
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
            {suggestions.slice(0, 3).map((suggestion) => (
              <button key={suggestion} type="button" disabled={loading} onClick={() => void send(suggestion)}>
                {suggestion}
              </button>
            ))}
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

      <button
        type="button"
        className="sand-trigger"
        aria-label={open ? 'إغلاق مساعد سَند' : 'افتح مساعد سَند'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sand-trigger__icon"><SandIcon /></span>
        <span className="sand-trigger__copy"><strong>اسأل سَند</strong><small>يدلّك من الدليل</small></span>
      </button>
    </div>
  );
}
