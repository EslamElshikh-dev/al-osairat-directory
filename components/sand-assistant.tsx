'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isSandContextResetCommand, sandNavigationHref } from '@/lib/sand/navigation';
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
  text: 'أهلًا بيك يا طيب، أنا سَند؛ مساعدك المحلي في دليل العسيرات. قولّي بتدور على خدمة إيه وفي أي قرية، وأنا أرتّب لك أقرب النتائج من بيانات الدليل.',
};

const starterSuggestions = [
  'دكتور أسنان في أولاد حمزة',
  'صيدلية في الرشايدة',
  'مواصلات العسيرات',
  'خدمات النويرات',
  'أرقام الطوارئ',
  'أحدث أخبار العسيرات',
];

function SandAvatar({ variant }: { variant: 'header' | 'trigger' }) {
  return (
    <span className={`sand-avatar sand-avatar--${variant}`} aria-hidden="true">
      <Image
        src="/images/sand-avatar-v3.webp"
        alt=""
        fill
        sizes="50px"
        className="sand-avatar__image"
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

function safeWhatsAppHref(phone?: string) {
  if (!phone) return '';
  let value = phone.replace(/\D/g, '');
  if (/^01\d{9}$/.test(value)) value = `20${value.slice(1)}`;
  if (!/^\d{8,15}$/.test(value)) return '';
  return `https://wa.me/${value}`;
}

function safeGoogleMapsHref(value?: string) {
  if (!value) return '';
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const allowed = host === 'maps.google.com'
      || host === 'www.google.com'
      || host === 'google.com'
      || host === 'maps.app.goo.gl'
      || host.endsWith('.google.com');
    return url.protocol === 'https:' && allowed ? url.toString() : '';
  } catch {
    return '';
  }
}

function formatSandDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function ResultCard({ result, onNavigate }: { result: SandResult; onNavigate: () => void }) {
  const href = result.href.startsWith('/listing/') ? result.href : '/directory';
  const phone = safePhoneHref(result.phone);
  const whatsapp = safeWhatsAppHref(result.whatsapp);
  const maps = safeGoogleMapsHref(result.googleMapsUrl);
  const lastUpdated = formatSandDate(result.lastUpdatedAt);

  return (
    <article className="sand-result">
      <div className="sand-result__head">
        <span>{result.categoryLabel}</span>
        <small>{result.sourceLabel}</small>
      </div>
      <strong>{result.title}</strong>
      <p>{[result.village, result.location].filter(Boolean).join(' · ')}</p>
      {result.hours ? <small className="sand-result__hours">المواعيد: {result.hours}</small> : null}
      {lastUpdated ? <small className="sand-result__freshness">آخر تحديث: {lastUpdated}</small> : null}
      <div className="sand-result__actions">
        <Link href={href} onClick={onNavigate}>التفاصيل</Link>
        {phone ? <a href={phone}>اتصال</a> : null}
        {whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer">واتساب</a> : null}
        {maps ? <a href={maps} target="_blank" rel="noopener noreferrer">الخريطة</a> : null}
      </div>
    </article>
  );
}

function sourceLabel(payload?: SandApiResponse) {
  if (!payload) return '';
  if (payload.dataSource === 'supabase') return 'بيانات الدليل الحية';
  if (payload.dataSource === 'local_snapshot') return 'بيانات الدليل المنشورة';
  if (payload.dataSource === 'static_emergency') return 'أرقام طوارئ ثابتة';
  return '';
}

function modeLabel(payload?: SandApiResponse) {
  if (!payload) return '';
  if (payload.mode === 'groq' || payload.mode === 'cloudflare') return 'صياغة ذكية';
  if (payload.mode === 'emergency') return 'وضع الطوارئ';
  return 'بحث مباشر';
}

export function SandAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatEntry[]>([welcome]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastFailedText, setLastFailedText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const restoreTriggerFocusRef = useRef(false);
  const previousPathnameRef = useRef(pathname);

  const latestPayload = useMemo(
    () => [...messages].reverse().find((message) => message.payload)?.payload,
    [messages],
  );
  const suggestions = useMemo(
    () => [...new Set([...(latestPayload?.suggestions || []), ...starterSuggestions])].slice(0, 6),
    [latestPayload],
  );

  useEffect(() => {
    if (previousPathnameRef.current !== pathname) {
      requestRef.current?.abort();
      requestRef.current = null;
      setOpen(false);
      setMessages([welcome]);
      setInput('');
      setLoading(false);
      setError('');
      setLastFailedText('');
      previousPathnameRef.current = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    if (open || !restoreTriggerFocusRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>('[data-sand-trigger="true"]')?.focus();
      restoreTriggerFocusRef.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 80);
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') closePanel();
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

  function cancelActiveRequest() {
    const activeRequest = requestRef.current;
    if (!activeRequest) return false;
    requestRef.current = null;
    activeRequest.abort();
    setLoading(false);
    setError('');
    setLastFailedText('');
    return true;
  }

  function closePanel() {
    cancelActiveRequest();
    restoreTriggerFocusRef.current = true;
    setOpen(false);
  }

  function resetConversation() {
    cancelActiveRequest();
    setMessages([welcome]);
    setInput('');
    setError('');
    setLastFailedText('');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function send(raw: string, options: { appendUser?: boolean } = {}) {
    const text = raw.trim().slice(0, 500);
    if (text.length < 2 || loading) return;

    if (isSandContextResetCommand(text)) {
      resetConversation();
      return;
    }

    const navigationHref = sandNavigationHref(text);
    if (navigationHref) {
      requestRef.current?.abort();
      requestRef.current = null;
      setOpen(false);
      setError('');
      setLastFailedText('');
      router.push(navigationHref);
      return;
    }

    const appendUser = options.appendUser !== false;
    const userEntry: ChatEntry = { id: crypto.randomUUID(), role: 'user', text };
    const history = messages.slice(-6).map((message) => ({ role: message.role, text: message.text }));
    if (appendUser) {
      setMessages((current) => [...current, userEntry].slice(-30));
    }
    setInput('');
    setError('');
    setLastFailedText('');
    setLoading(true);

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 18_000);

    try {
      const response = await fetch('/api/sand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ message: text, history }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({})) as Partial<SandApiResponse> & { error?: string };
      if (!response.ok || !data.message) throw new Error(data.error || 'تعذر الوصول إلى سَند الآن.');

      const payload = data as SandApiResponse;
      const assistantEntry: ChatEntry = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: payload.message,
        payload,
      };
      setMessages((current) => [...current, assistantEntry].slice(-30));
    } catch (cause) {
      if (controller.signal.aborted && requestRef.current !== controller) return;
      setLastFailedText(text);
      setError(
        cause instanceof DOMException && cause.name === 'AbortError'
          ? 'سَند اتأخر في الرد، فوقفنا الطلب بدل ما يفضل معلّق. تقدر تعيد المحاولة الآن.'
          : cause instanceof Error
            ? cause.message
            : 'تعذر الوصول إلى سَند الآن.',
      );
    } finally {
      window.clearTimeout(timer);
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
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
        <section
          id="sand-panel"
          className="sand-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="sand-title"
          aria-describedby="sand-privacy"
        >
          <header className="sand-panel__header">
            <SandAvatar variant="header" />
            <div className="sand-panel__identity">
              <span className="sand-panel__eyebrow">دليل العسيرات · مساعد بحث محلي</span>
              <strong id="sand-title">سَند</strong>
              <small><i /> يبحث في بيانات الدليل المنشورة ويرتبها لك</small>
            </div>
            <button
              type="button"
              className="sand-panel__reset"
              onClick={resetConversation}
              aria-label="بدء محادثة جديدة"
              title="محادثة جديدة"
              disabled={messages.length === 1 && !input && !error}
            >
              جديد
            </button>
            <button type="button" onClick={closePanel} aria-label="تصغير سَند">×</button>
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
                    {message.payload.results.map((result) => <ResultCard key={result.id} result={result} onNavigate={() => setOpen(false)} />)}
                  </div>
                ) : null}
                {message.payload ? (
                  <div className="sand-message__meta">
                    <div className="sand-message__status">
                      <span>{sourceLabel(message.payload)}</span>
                      <b>{modeLabel(message.payload)}</b>
                    </div>
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
            {error ? (
              <div className="sand-error" role="alert">
                <span>{error}</span>
                {lastFailedText ? (
                  <button type="button" disabled={loading} onClick={() => void send(lastFailedText, { appendUser: false })}>
                    إعادة المحاولة
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="sand-suggestions" aria-label="اقتراحات سريعة">
            <span className="sand-suggestions__label">جرّب تسأل عن</span>
            <div className="sand-suggestions__list">
              {suggestions.map((suggestion) => {
                const href = sandNavigationHref(suggestion);
                return href ? (
                  <Link key={suggestion} href={href} onClick={() => setOpen(false)}>
                    {suggestion}
                  </Link>
                ) : (
                  <button key={suggestion} type="button" disabled={loading} onClick={() => void send(suggestion)}>
                    {suggestion}
                  </button>
                );
              })}
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
              placeholder="قولّي الخدمة والقرية… مثال: صيدلية في أولاد حمزة"
              enterKeyHint="send"
              disabled={loading}
            />
            {loading ? (
              <button
                type="button"
                className="sand-composer__cancel"
                onClick={cancelActiveRequest}
                aria-label="إيقاف الطلب الجاري"
                title="إيقاف الطلب"
              >
                <span aria-hidden="true" />
              </button>
            ) : (
              <button type="submit" disabled={input.trim().length < 2} aria-label="إرسال الرسالة">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="m4 12 16-8-6.5 16-2.2-6.1L4 12Z" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </form>
          <p id="sand-privacy" className="sand-privacy">لا تُرسل كلمات مرور أو بيانات شخصية حساسة. المحادثة لا تُحفظ في حسابك.</p>
        </section>
      ) : null}

      {!open ? (
        <button
          type="button"
          className="sand-trigger"
          aria-label="افتح مساعد سَند"
          aria-controls="sand-panel"
          aria-haspopup="dialog"
          aria-expanded={open}
          data-sand-trigger="true"
          onClick={() => setOpen(true)}
        >
          <span className="sand-invite" aria-hidden="true">
            <span className="sand-invite__spark">✦</span>
            <span className="sand-invite__text">أنا سَند… بتدور على إيه؟</span>
          </span>
          <SandAvatar variant="trigger" />
        </button>
      ) : null}
    </div>
  );
}
