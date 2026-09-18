import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifySandMessage } from '../lib/sand/safety.ts';
import { directSandReply } from '../lib/sand/persona.ts';

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Sand has a friendly fallback when directory grounding is temporarily unavailable', () => {
  const reply = directSandReply(
    classifySandMessage('عايز صيدلية في الرشايدة'),
    undefined,
    'search_unavailable',
    { intent: 'directory', normalized: 'عايز صيدليه في الرشايده', confidence: 1, category: 'pharmacies', categoryLabel: 'صيدلية', village: 'الرشايدة', query: '', resolvedFromHistory: false },
  );
  assert.match(reply, /تأخير مؤقت/);
  assert.match(reply, /جرّب نفس الطلب تاني/);
});

test('Sand route bounds AI time and logs privacy-safe diagnostics without message text', async () => {
  const source = await readProjectFile('app/api/sand/route.ts');

  assert.match(source, /const aiBudgetMs = 7_500/);
  assert.match(source, /AbortController/);
  assert.match(source, /abortSignal: aiController\.signal/);
  assert.match(source, /\[sand\] response/);
  assert.match(source, /durationMs/);
  assert.doesNotMatch(source, /console\.(?:info|warn)\([^\n]*message\b/);
});

test('Sand provider generation accepts the shared abort signal', async () => {
  const source = await readProjectFile('lib/sand/agent.ts');

  assert.match(source, /options: \{ abortSignal\?: AbortSignal \}/);
  assert.match(source, /abortSignal: options\.abortSignal/);
  assert.match(source, /if \(options\.abortSignal\?\.aborted\) return null/);
});

test('Sand client closes on navigation, times out stalled requests and exposes retry', async () => {
  const source = await readProjectFile('components/sand-assistant.tsx');

  assert.match(source, /usePathname/);
  assert.match(source, /previousPathnameRef/);
  assert.match(source, /setOpen\(false\)/);
  assert.match(source, /window\.setTimeout\(\(\) => controller\.abort\(\), 18_000\)/);
  assert.match(source, /إعادة المحاولة/);
  assert.match(source, /appendUser: false/);
});

test('Sand UI distinguishes direct search from smart wording and uses accurate published-data label', async () => {
  const source = await readProjectFile('components/sand-assistant.tsx');

  assert.match(source, /بحث مباشر/);
  assert.match(source, /صياغة ذكية/);
  assert.match(source, /بيانات الدليل المنشورة/);
});


test('Sand launcher keeps the visible invitation inside the clickable hit target', async () => {
  const [css, component] = await Promise.all([
    readProjectFile('app/sand-assistant.css'),
    readProjectFile('components/sand-assistant.tsx'),
  ]);

  assert.match(css, /\.sand-invite\s*\{[\s\S]*?pointer-events:\s*auto/);
  assert.match(css, /\.sand-trigger::after\s*\{[\s\S]*?inset:\s*-8px/);
  assert.match(css, /touch-action:\s*manipulation/);
  assert.match(component, /data-sand-trigger="true"/);
  assert.match(component, /aria-expanded=\{open\}/);
});


test('Sand navigation suggestions open real routes and never become directory searches', async () => {
  const source = await readProjectFile('components/sand-assistant.tsx');

  assert.match(source, /'أخبار العسيرات': '\/news'/);
  assert.match(source, /'قرى العسيرات': '\/villages'/);
  assert.match(source, /'خدمات الدليل': '\/directory'/);
  assert.match(source, /navigationSuggestionHref\(text\)/);
  assert.match(source, /router\.push\(navigationHref\)/);
  assert.match(source, /<Link key=\{suggestion\} href=\{href\}/);
});


test('Sand clears stale conversation state and aborts in-flight work on route changes or reset', async () => {
  const source = await readProjectFile('components/sand-assistant.tsx');

  assert.match(source, /const requestRef = useRef<AbortController \| null>\(null\)/);
  assert.match(source, /requestRef\.current\?\.abort\(\)/);
  assert.match(source, /setMessages\(\[welcome\]\)/);
  assert.match(source, /function resetConversation\(\)/);
  assert.match(source, /بدء محادثة جديدة/);
  assert.match(source, /controller\.signal\.aborted && requestRef\.current !== controller/);
});

test('Sand uses the shared navigation intent helper rather than component-local magic mappings', async () => {
  const source = await readProjectFile('components/sand-assistant.tsx');

  assert.match(source, /sandNavigationHref/);
  assert.match(source, /isSandContextResetCommand/);
  assert.doesNotMatch(source, /const navigationSuggestions: Record/);
});


test('Sand can cancel an active request and stops in-flight work when the panel closes', async () => {
  const [component, css] = await Promise.all([
    readProjectFile('components/sand-assistant.tsx'),
    readProjectFile('app/sand-assistant.css'),
  ]);

  assert.match(component, /function cancelActiveRequest\(\)/);
  assert.match(component, /activeRequest\.abort\(\)/);
  assert.match(component, /function closePanel\(\)/);
  assert.match(component, /cancelActiveRequest\(\);\s*setOpen\(false\)/);
  assert.match(component, /aria-label="إيقاف الطلب الجاري"/);
  assert.match(component, /className="sand-composer__cancel"/);
  assert.match(component, /if \(event\.key === 'Escape'\) closePanel\(\)/);
  assert.match(css, /\.sand-composer \.sand-composer__cancel/);
});


test('Sand mobile UX restores launcher focus and locks background scrolling', async () => {
  const [component, css] = await Promise.all([
    readProjectFile('components/sand-assistant.tsx'),
    readProjectFile('app/sand-assistant.css'),
  ]);

  assert.match(component, /restoreTriggerFocusRef/);
  assert.match(component, /requestAnimationFrame/);
  assert.match(component, /\[data-sand-trigger="true"\]/);
  assert.match(component, /aria-describedby="sand-privacy"/);
  assert.match(component, /enterKeyHint="send"/);
  assert.match(css, /body:has\(\.sand-assistant\.is-open\)[\s\S]*?overflow:\s*hidden/);
  assert.match(css, /overscroll-behavior:\s*none/);
});

test('Sand avatar avoids global image preload competition and result cards expose freshness', async () => {
  const [component, css] = await Promise.all([
    readProjectFile('components/sand-assistant.tsx'),
    readProjectFile('app/sand-assistant.css'),
  ]);

  assert.doesNotMatch(component, /\bpriority\b/);
  assert.match(component, /sizes="50px"/);
  assert.match(component, /loading="eager"/);
  assert.match(component, /formatSandDate/);
  assert.match(component, /آخر تحديث:/);
  assert.match(css, /\.sand-result__freshness/);
});
