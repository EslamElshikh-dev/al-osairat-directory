import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function authClient(fetcher, deadlines) {
  const record = { exports: {} };
  const source = readFileSync(new URL('../lib/auth/supabase-rest.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports: record.exports, module: record,
    require: () => ({ PASSWORD_POLICY_LAUNCHED_AT: '', PASSWORD_POLICY_VERSION: 1 }),
    fetch: fetcher, Response, Error, Date, Set,
    process: { env: { NODE_ENV: 'test' } },
    AbortSignal: {
      timeout(milliseconds) { deadlines.push(milliseconds); return AbortSignal.timeout(5); },
      any: AbortSignal.any,
    },
  });
  return record.exports;
}

test('a stalled identity provider is cancelled within a bounded request deadline', async () => {
  const deadlines = [];
  let signal;
  const client = authClient((_url, init) => {
    signal = init.signal;
    return new Promise((resolve, reject) => {
      const keepAlive = setTimeout(() => reject(new Error('request was not cancelled')), 100);
      signal.addEventListener('abort', () => { clearTimeout(keepAlive); reject(signal.reason); }, { once: true });
    });
  }, deadlines);
  await assert.rejects(client.getUser('synthetic-test-token'), { name: 'TimeoutError' });
  assert.equal(signal.aborted, true);
  assert.ok(deadlines[0] > 0 && deadlines[0] <= 10_000);
});

test('a successful identity response keeps its value and cannot be shared from a cache', async () => {
  const deadlines = [];
  const identity = { id: 'synthetic-member', email: 'member@example.test' };
  const client = authClient(async (_url, init) => {
    assert.equal(init.cache, 'no-store');
    assert.ok(init.signal instanceof AbortSignal);
    return Response.json(identity);
  }, deadlines);
  assert.deepEqual(await client.getUser('synthetic-test-token'), identity);
});
