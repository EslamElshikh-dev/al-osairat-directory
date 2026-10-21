import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../lib/use-browser-state.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function storage({ blockReads = false, blockWrites = false } = {}) {
  const values = new Map();
  const window = new EventTarget();
  const snapshots = [];
  window.localStorage = {
    getItem(key) {
      if (blockReads) throw new Error('Storage blocked');
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (blockWrites) throw new Error('Storage blocked');
      values.set(key, value);
    },
  };
  const testModule = { exports: {} };
  vm.runInNewContext(code, {
    module: testModule, exports: testModule.exports, window, Event,
    require: () => ({
      useCallback: (callback) => callback,
      useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
        snapshots.push({ subscribe, getSnapshot, getServerSnapshot });
        return getSnapshot();
      },
    }),
  });
  return { api: testModule.exports, values, window, snapshots };
}

test('browser state provides stable snapshots and matching server hydration defaults', () => {
  const app = storage();
  assert.equal(app.api.useHydrated(), true);
  assert.equal(app.snapshots[0].getServerSnapshot(), false);
  app.values.set('seen', '["one"]');
  assert.equal(app.api.useLocalStorageValue('seen'), '["one"]');
  const snapshot = app.snapshots[1];
  assert.equal(snapshot.getServerSnapshot(), null);
  assert.equal(snapshot.getSnapshot(), snapshot.getSnapshot());
});

test('reading an update synchronizes both local subscribers and cleans up subscriptions', () => {
  const app = storage();
  app.api.useLocalStorageValue('seen');
  const snapshot = app.snapshots[0];
  const bell = [], panel = [];
  const stopBell = snapshot.subscribe(() => bell.push(snapshot.getSnapshot()));
  const stopPanel = snapshot.subscribe(() => panel.push(snapshot.getSnapshot()));
  app.api.setLocalStorageValue('seen', '["one"]');
  assert.deepEqual(bell, ['["one"]']);
  assert.deepEqual(panel, ['["one"]']);
  assert.equal(app.values.get('seen'), '["one"]');
  stopBell(); stopPanel();
  app.api.setLocalStorageValue('seen', '["two"]');
  assert.equal(bell.length, 1);
  assert.equal(panel.length, 1);
});

test('a storage event from another tab replaces the previous local snapshot', () => {
  const app = storage();
  app.api.useLocalStorageValue('seen');
  const snapshot = app.snapshots[0];
  const observed = [];
  const stop = snapshot.subscribe(() => observed.push(snapshot.getSnapshot()));
  app.api.setLocalStorageValue('seen', '["local"]');
  app.values.set('seen', '["other-tab"]');
  const event = new Event('storage');
  Object.defineProperty(event, 'key', { value: 'seen' });
  app.window.dispatchEvent(event);
  assert.equal(observed.at(-1), '["other-tab"]');
  stop();
});

for (const blockReads of [false, true]) {
  test(`blocked storage writes preserve per-tab read state (reads blocked: ${blockReads})`, () => {
    const app = storage({ blockReads, blockWrites: true });
    app.values.set('seen', '["old"]');
    app.api.useLocalStorageValue('seen');
    const snapshot = app.snapshots[0];
    let current;
    const stop = snapshot.subscribe(() => { current = snapshot.getSnapshot(); });
    app.api.setLocalStorageValue('seen', '["new"]');
    assert.equal(current, '["new"]');
    assert.equal(snapshot.getSnapshot(), '["new"]');
    stop();
  });
}
