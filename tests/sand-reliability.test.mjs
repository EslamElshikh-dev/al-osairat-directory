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
