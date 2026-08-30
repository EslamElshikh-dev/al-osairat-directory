import test from 'node:test';
import assert from 'node:assert/strict';
import { planSandRequest } from '../lib/sand/intent.ts';
import { directSandReply } from '../lib/sand/persona.ts';
import { classifySandMessage } from '../lib/sand/safety.ts';

const villages = [
  { name: 'أولاد حمزة', localities: ['النبافوة الغربي', 'السقاقوة'] },
  { name: 'جزيرة أولاد حمزة', localities: ['محمدين', 'صبرة'] },
  { name: 'الرشايدة', localities: ['العجوبية', 'جبرة'] },
  { name: 'الأحايوة غرب', localities: ['عسر البحري', 'القاضي'] },
  { name: 'النويرات', localities: ['النجع المستجد', 'مجلع'] },
  { name: 'عوامر العسيرات', localities: ['الديابية', 'نجع عمر'] },
  { name: 'الشهداء', localities: ['فراج', 'الكوبري'] },
  { name: 'أولاد جبارة', localities: ['قمارية', 'أبو زغيلة'] },
  { name: 'المساعيد', localities: ['نجع السوالم', 'طراف'] },
  { name: 'أولاد بهيج', localities: ['الشيخ علي', 'بازوكي'] },
];

const naturalIntentCases = [
  ['محتاج حد يكشف عليا', 'doctors', ''],
  ['سناني واجعاني وعايز أكشف', 'doctors', 'اسنان'],
  ['نظري تعبان ومحتاج حد يشوفني', 'doctors', 'عيون'],
  ['دكتو أطفال فين', 'doctors', 'اطفال'],
  ['عايز عيادة قريبة', 'doctors', ''],
  ['فين صيدل', 'pharmacies', ''],
  ['عايز أصرف روشتة', 'pharmacies', ''],
  ['سوبر ماركت في العسيرات', 'shops', 'سوبر ماركت'],
  ['محل موبايلات', 'shops', 'موبايلات'],
  ['مدرس رياضيات', 'education', 'رياضيات'],
  ['حضانة في الرشايدة', 'education', ''],
  ['الحنفية بتسرب وعايز حد يصلحها', 'crafts', 'سباك'],
  ['النور قاطع وعايز حد يصلحه', 'crafts', 'كهربائي'],
  ['العربية عطلانة', 'crafts', 'ميكانيكي'],
  ['باب البيت عايز تصليح', 'crafts', 'نجار'],
  ['محتاج سبك في أولاد بهيج', 'crafts', 'سباك'],
  ['عايز نقاش', 'crafts', 'نقاش'],
  ['عايز أكل كباب', 'restaurants', 'كباب'],
  ['فيه كافيه هنا', 'restaurants', 'كافيه'],
  ['عندي قضية ومحتاج حد', 'lawyers', ''],
  ['محام في أولاد جبارة', 'lawyers', ''],
  ['عايز مأذون لكتب الكتاب', 'clerics', ''],
  ['عايز شهادة ميلاد', 'government', 'سجل مدني'],
  ['مكتب بريد قريب', 'government', 'بريد'],
  ['فين ديوان العيلة', 'community', 'العيله'],
  ['عايز مكان أصلي فيه', 'worship', ''],
  ['كنيسة في الشهداء', 'worship', ''],
  ['عايز أروح سوهاج', 'transport', 'سوهاج'],
  ['فين موقف العربيات', 'transport', 'العربيات'],
  ['محتاج توك توك', 'transport', ''],
];

for (const [message, category, query] of naturalIntentCases) {
  test(`understands intent: ${message}`, () => {
    const plan = planSandRequest(message, [], villages);
    assert.equal(plan.intent === 'directory' || plan.intent === 'clarify', true);
    assert.equal(plan.category, category);
    assert.equal(plan.query, query);
  });
}

const partialAndVillageCases = [
  ['صيدليه ف الرشايده', 'pharmacies', 'الرشايدة'],
  ['دكتو فالاحايوه', 'doctors', 'الأحايوة غرب'],
  ['محام ف اولاد جباره', 'lawyers', 'أولاد جبارة'],
  ['مواصل ف المساعيد', 'transport', 'المساعيد'],
  ['سبك في اولاد بهيج', 'crafts', 'أولاد بهيج'],
  ['مطعم فالنويرات', 'restaurants', 'النويرات'],
  ['جامع في عوامر العسيرات', 'worship', 'عوامر العسيرات'],
  ['صيدلية في السقاقوة', 'pharmacies', 'أولاد حمزة'],
];

for (const [message, category, village] of partialAndVillageCases) {
  test(`partial and village match: ${message}`, () => {
    const plan = planSandRequest(message, [], villages);
    assert.equal(plan.intent, 'directory');
    assert.equal(plan.category, category);
    assert.equal(plan.village, village);
  });
}

const contextCases = [
  {
    message: 'في أولاد حمزة',
    history: [{ role: 'user', text: 'عايز صيدلية' }],
    category: 'pharmacies',
    village: 'أولاد حمزة',
  },
  {
    message: 'طب في الرشايدة',
    history: [{ role: 'user', text: 'عايز دكتور في أولاد حمزة' }],
    category: 'doctors',
    village: 'الرشايدة',
  },
  {
    message: 'عايز سباك',
    history: [{ role: 'user', text: 'في المساعيد' }],
    category: 'crafts',
    village: 'المساعيد',
  },
  {
    message: 'والصيدليات؟',
    history: [{ role: 'user', text: 'عايز دكتور في أولاد جبارة' }],
    category: 'pharmacies',
    village: 'أولاد جبارة',
  },
  {
    message: 'في الرشايدة',
    history: [{ role: 'user', text: 'محتاج دكتور عيون' }],
    category: 'doctors',
    village: 'الرشايدة',
    query: 'عيون',
  },
];

for (const contextCase of contextCases) {
  test(`uses conversation context: ${contextCase.message}`, () => {
    const plan = planSandRequest(contextCase.message, contextCase.history, villages);
    assert.equal(plan.intent, 'directory');
    assert.equal(plan.category, contextCase.category);
    assert.equal(plan.village, contextCase.village);
    if (contextCase.query) assert.equal(plan.query, contextCase.query);
    assert.equal(plan.resolvedFromHistory, true);
  });
}

test('asks for the village only when proximity needs it', () => {
  const plan = planSandRequest('أقرب صيدلية', [], villages);
  assert.equal(plan.category, 'pharmacies');
  assert.equal(plan.clarification, 'village');
});

test('asks for the service when only a village is known', () => {
  const plan = planSandRequest('في أولاد حمزة', [], villages);
  assert.equal(plan.village, 'أولاد حمزة');
  assert.equal(plan.clarification, 'service');
});

test('asks one focused question for a generic request', () => {
  const plan = planSandRequest('عايز حد قريب', [], villages);
  assert.equal(plan.intent, 'clarify');
  assert.equal(plan.clarification, 'request');
});

test('a greeting plus a request stays on the directory route', () => {
  const plan = planSandRequest('السلام عليكم، عايز دكتور في الرشايدة', [], villages);
  assert.equal(plan.intent, 'directory');
  assert.equal(plan.category, 'doctors');
  assert.equal(plan.village, 'الرشايدة');
});

test('medical safety outranks a generic clarification route', () => {
  const message = 'ما العلاج المناسب للصداع؟';
  const plan = planSandRequest(message, [], villages);
  const reply = directSandReply(classifySandMessage(message), undefined, 'provider_unavailable', plan);
  assert.match(reply, /ما أقدرش أشخّص أو أوصف علاج/);
});
