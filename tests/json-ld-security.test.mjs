import assert from 'node:assert/strict';
import test from 'node:test';
import { jsonLdStringify } from '../lib/json-ld.ts';

test('member names and biographies cannot terminate the structured-data script', () => {
  const profile = {
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: '</ScRiPt><script>unexpected()</script>',
      description: 'نبذة عربية <عادية> & "اقتباس"\n</script><template id=unexpected></template>',
    },
  };
  const serialized = jsonLdStringify(profile);
  assert.equal(/<\/script\b/i.test(serialized), false);
  assert.equal(/<\s*(?:script|template)\b/i.test(serialized), false);
  assert.deepEqual(JSON.parse(serialized), profile);
});

test('nested fields keep Arabic, URLs and JSON values without creating HTML tags', () => {
  const data = {
    '@graph': [{ name: 'أهل العسيرات', url: 'https://usayrat.online/search?q=<خدمة>&page=2' }],
    values: [null, true, 0, 'a<!--comment--><img src=x>'],
  };
  const serialized = jsonLdStringify(data);
  assert.equal(serialized.includes('<'), false);
  assert.deepEqual(JSON.parse(serialized), data);
});
