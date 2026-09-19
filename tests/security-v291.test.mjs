import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('V2.9.1 prevents automatic function EXECUTE exposure', async () => {
  const migration = await readProjectFile('supabase/migrations/20260919092000_v291_security_hardening.sql');
  assert.match(migration, /alter default privileges for role postgres in schema public/);
  assert.match(migration, /revoke execute on functions from public/);
  assert.match(migration, /revoke execute on functions from anon, authenticated, service_role/);
});

test('V2.9.1 removes pg_temp from audited SECURITY DEFINER search paths', async () => {
  const migration = await readProjectFile('supabase/migrations/20260919092000_v291_security_hardening.sql');
  assert.doesNotMatch(migration, /set search_path = pg_catalog, public, auth, pg_temp/);
  assert.ok((migration.match(/set search_path = pg_catalog, public, auth/g) || []).length >= 10);
  assert.match(migration, /public\.is_directory_admin\(\)\s+set search_path = ''/s);
});

test('V2.9.1 keeps privileged RPC grants explicit', async () => {
  const migration = await readProjectFile('supabase/migrations/20260919092000_v291_security_hardening.sql');
  assert.ok((migration.match(/from public, anon/g) || []).length >= 11);
  assert.ok((migration.match(/to authenticated/g) || []).length >= 11);
});

test('V2.9.1 CSP blocks inline script attributes and framing', async () => {
  const config = await readProjectFile('next.config.ts');
  assert.match(config, /script-src-attr 'none'/);
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /base-uri 'none'/);
  assert.match(config, /X-Frame-Options', value: 'DENY'/);
  assert.match(config, /X-Permitted-Cross-Domain-Policies', value: 'none'/);
});

test('V2.9.1 removes the redundant executable inline scroll bootstrap', async () => {
  const layout = await readProjectFile('app/layout.tsx');
  assert.doesNotMatch(layout, /scrollRestorationScript/);
  assert.doesNotMatch(layout, /<script dangerouslySetInnerHTML=\{\{ __html: scrollRestorationScript/);
  assert.match(layout, /<NavigationScrollManager/);
});
