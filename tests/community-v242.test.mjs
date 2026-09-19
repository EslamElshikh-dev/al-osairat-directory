import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Community V2.4.2 weekly ranking uses Cairo-local calendar dates end to end', async () => {
  const migration = await readProjectFile('supabase/migrations/20260919062000_community_v242_cairo_week_smart_digest.sql');
  const activity = await readProjectFile('lib/community-activity.ts');

  assert.match(migration, /at time zone 'Africa\/Cairo'/);
  assert.doesNotMatch(migration, /at time zone 'UTC'/);
  assert.match(activity, /timeZone: 'Africa\/Cairo'/);
  assert.match(activity, /sevenDayStartLocal/);
  assert.doesNotMatch(activity, /sevenDayStartUtc/);
});

test('new review replies stay grouped but become unread again', async () => {
  const migration = await readProjectFile('supabase/migrations/20260919062000_community_v242_cairo_week_smart_digest.sql');

  assert.match(migration, /n\.last_event_at >= now\(\) - interval '6 hours'/);
  assert.match(migration, /event_count = next_count/);
  assert.match(migration, /read_at = null/);
  assert.match(migration, /وصلت ' \|\| next_count::text \|\| ' ردود جديدة على تقييمك/);
});

test('helpful notifications resurface only at meaningful milestones after being read', async () => {
  const migration = await readProjectFile('supabase/migrations/20260919062000_community_v242_cairo_week_smart_digest.sql');

  assert.match(migration, /v_next_count in \(3, 5, 10, 25, 50, 100, 250, 500, 1000\)/);
  assert.match(migration, /read_at = case when v_resurface then null else v_existing\.read_at end/);
  assert.match(migration, /event_count = v_next_count/);
  assert.match(migration, /last_event_at = now\(\)/);
});

test('daily aggregate rebuild remains privacy-safe', async () => {
  const migration = await readProjectFile('supabase/migrations/20260919062000_community_v242_cairo_week_smart_digest.sql');

  assert.match(migration, /delete from public\.community_reaction_daily_totals/);
  assert.match(migration, /count\(\*\) filter \(where reaction_type = 'helpful'\)/);
  assert.doesNotMatch(migration, /select .*user_id.*community_reaction_daily_totals/is);
});
