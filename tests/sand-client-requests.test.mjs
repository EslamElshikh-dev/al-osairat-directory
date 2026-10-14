import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { sandNavigationHref, isSandContextResetCommand } from '../lib/sand/navigation.ts';

const source = await readFile(new URL('../components/sand-assistant.tsx', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function client() {
  const hooks = [];
  let cursor = 0;
  const pending = [];
  const paths = [];
  const element = (type, props, key) => ({ type, props, key });
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = initial;
      return [hooks[index], (next) => { hooks[index] = typeof next === 'function' ? next(hooks[index]) : next; }];
    },
    useRef(initial) {
      const index = cursor++;
      hooks[index] ??= { current: initial };
      return hooks[index];
    },
    useMemo: (get) => get(),
    useEffect: () => {},
  };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, AbortController, DOMException,
    crypto: globalThis.crypto,
    window: { setTimeout: () => 1, clearTimeout: () => {} },
    fetch: (_url, init) => new Promise((resolve) => { pending.push({ resolve, signal: init.signal }); }),
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
      if (name === 'next/navigation') return { usePathname: () => '/sand', useRouter: () => ({ push: (path) => paths.push(path) }) };
      if (name === '@/lib/sand/navigation') return { sandNavigationHref, isSandContextResetCommand };
      if (name === 'next/link' || name === '@/components/site-image') return { default: name };
      throw new Error('Unexpected component import: ' + name);
    },
  });
  function render(prompt = 'صيدلية في الرشايدة') {
    cursor = 0;
    return module.exports.SandAssistant({ initialPrompt: prompt });
  }
  return { render, pending, paths };
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  if (predicate(node)) return node;
  return find(node.props?.children, predicate);
}
const flush = () => new Promise((resolve) => setImmediate(resolve));
const reply = (message) => ({ ok: true, json: async () => ({ message, results: [], suggestions: [], mode: 'direct', dataSource: 'none' }) });

test('closing Sand cancels a pending request and ignores its late reply', async () => {
  const app = client();
  const tree = app.render();
  find(tree, (node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(app.pending.length, 1);
  find(tree, (node) => node.props?.['aria-label'] === 'تصغير سَند').props.onClick();
  assert.equal(app.pending[0].signal.aborted, true);
  app.pending[0].resolve(reply('رد متأخر يجب تجاهله'));
  await flush();
  const closed = app.render();
  find(closed, (node) => node.props?.['data-sand-trigger'] === 'true').props.onClick();
  assert.doesNotMatch(JSON.stringify(app.render()), /رد متأخر يجب تجاهله/);
});

test('resetting Sand during a response body discards the old body and preserves the next reply', async () => {
  const app = client();
  const first = app.render();
  find(first, (node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  let resolveBody;
  app.pending[0].resolve({ ok: true, json: () => new Promise((resolve) => { resolveBody = resolve; }) });
  await flush();
  find(app.render(), (node) => node.props?.['aria-label'] === 'بدء محادثة جديدة').props.onClick();
  assert.equal(app.pending[0].signal.aborted, true);
  const reset = app.render();
  find(reset, (node) => node.type === 'textarea').props.onChange({ target: { value: 'مطعم في النويرات' } });
  find(app.render(), (node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(app.pending.length, 2);
  app.pending[1].resolve(reply('رد الطلب الجديد'));
  await flush();
  resolveBody({ message: 'رد الطلب القديم', results: [], suggestions: [] });
  await flush();
  const final = JSON.stringify(app.render());
  assert.match(final, /رد الطلب الجديد/);
  assert.doesNotMatch(final, /رد الطلب القديم/);
});

test('Sand navigation commands open the real route without an API request', () => {
  for (const [prompt, path] of [['أخبار العسيرات', '/news'], ['أحدث أخبار العسيرات', '/news'], ['قرى العسيرات', '/villages'], ['خدمات الدليل', '/directory']]) {
    const app = client();
    find(app.render(prompt), (node) => node.type === 'form').props.onSubmit({ preventDefault() {} });
    assert.deepEqual(app.paths, [path]);
    assert.equal(app.pending.length, 0);
  }
});
