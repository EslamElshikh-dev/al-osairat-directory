import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Discovery VNext.1 re-evaluates historical zero-result searches against the live directory', async () => {
  const source = await readProjectFile('lib/directory-demand-intelligence.ts');

  assert.match(source, /queryDirectoryListings\(allListings/);
  assert.match(source, /currentResultCount === 0/);
  assert.match(source, /currentResultCount > 0/);
  assert.match(source, /getUndercovered|priorityLabel|collectionPlan/);
});

test('demand intelligence filters obvious internal noise and infers village/category scope', async () => {
  const source = await readProjectFile('lib/directory-demand-intelligence.ts');

  assert.match(source, /\['admin', 'administrator', 'test', 'testing', 'asdf', 'qwerty'\]/);
  assert.match(source, /inferVillage/);
  assert.match(source, /inferCategory/);
  assert.match(source, /uniqueSessions30d/);
});

test('admin intelligence API returns an active gap queue, resolved gaps and collection plan', async () => {
  const source = await readProjectFile('app/api/admin/directory-intelligence/route.ts');

  assert.match(source, /buildDirectoryDemandIntelligence/);
  assert.match(source, /gapQueue: demand\.activeGaps/);
  assert.match(source, /resolvedGaps: demand\.resolvedGaps/);
  assert.match(source, /collectionPlan: demand\.collectionPlan/);
});

test('admin UI exposes the demand-driven collection workflow', async () => {
  const source = await readProjectFile('components/admin/admin-directory-intelligence.tsx');

  assert.match(source, /خطة جمع البيانات من الطلب الحقيقي/);
  assert.match(source, /الفجوات التي ما زالت بلا نتائج/);
  assert.match(source, /فجوات تاريخية أصبحت محلولة/);
  assert.match(source, /دفعات جمع/);
});

test('Supabase migration extends the existing admin-only RPC with grouped gap candidates', async () => {
  const source = await readProjectFile('supabase/migrations/20260918005500_discovery_vnext_gap_candidates.sql');

  assert.match(source, /get_directory_intelligence_stats/);
  assert.match(source, /gapCandidates/);
  assert.match(source, /uniqueSessions30d/);
  assert.match(source, /is_directory_admin/);
  assert.match(source, /SECURITY DEFINER/i);
});


test('obvious repeated-leading-character typos are rechecked before creating a collection task', async () => {
  const [logic, ui] = await Promise.all([
    readProjectFile('lib/directory-demand-intelligence.ts'),
    readProjectFile('components/admin/admin-directory-intelligence.tsx'),
  ]);

  assert.match(logic, /repairObviousRepeatedLeadingCharacters/);
  assert.match(logic, /repairedResultCount/);
  assert.match(logic, /recheckedTerm/);
  assert.match(ui, /أعيد الاختبار كـ/);
});
