import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('directory search telemetry records the rendered result count instead of the previous page count', async () => {
  const [tracker, telemetry, explorer] = await Promise.all([
    readProjectFile('components/analytics-tracker.tsx'),
    readProjectFile('components/directory-search-telemetry.tsx'),
    readProjectFile('components/directory-explorer.tsx'),
  ]);

  assert.doesNotMatch(tracker, /document\.querySelector\('\.results-bar strong'\)/);
  assert.doesNotMatch(tracker, /handleSubmit\(event: SubmitEvent\)/);
  assert.match(tracker, /osayrat:directory-search-result/);
  assert.match(tracker, /result_count:/);

  assert.match(telemetry, /resultCount: number/);
  assert.match(telemetry, /CustomEvent\('osayrat:directory-search-result'/);
  assert.match(telemetry, /DEDUPE_WINDOW_MS = 3_000/);

  assert.match(explorer, /resultCount=\{result\.total\}/);
  assert.match(explorer, /DirectorySearchTelemetry/);
});
