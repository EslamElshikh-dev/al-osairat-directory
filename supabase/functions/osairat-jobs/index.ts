import { createClient } from 'npm:@supabase/supabase-js@2';

// Only public feeds and indexed results qualify. Preserve the original link and
// require an explicit Sohag location so names shared with other cities do not match.
// The token stays in Supabase Vault; only its one-way digest is deployed.
const EXPECTED_TOKEN_SHA256 = '9005b67e2135db28cc45fb788271755db56243e2393bed17e2cfb49d71f9ce9a';
const PLACES = ['جزيرة أولاد حمزة', 'عوامر العسيرات', 'الأحايوة غرب', 'أولاد جبارة', 'أولاد بهيج', 'أولاد حمزة', 'الرشايدة', 'النويرات', 'الشهداء', 'المساعيد'];
const CENTERS = ['أخميم الجديدة', 'سوهاج الجديدة', 'أخميم', 'البلينا', 'جرجا', 'دار السلام', 'جهينة', 'ساقلتة', 'طما', 'طهطا', 'المراغة', 'المنشأة', 'الكوثر', 'الكوامل'];
const googleNews = (query: string) => 'https://news.google.com/rss/search?q=' + encodeURIComponent(query + ' when:14d') + '&hl=ar&gl=EG&ceid=EG:ar';
const feeds = [
  { name: 'سوهاج 24', url: 'https://www.sohag24.com/feeds/posts/default?alt=rss' },
  { name: 'أخبار Google · سوهاج', url: googleNews('وظائف سوهاج مطلوب') },
  { name: 'أخبار Google · جنوب سوهاج', url: googleNews('وظائف البلينا جرجا دار السلام العسيرات') },
  { name: 'أخبار Google · شمال سوهاج', url: googleNews('وظائف طما طهطا المراغة جهينة ساقلتة') },
  { name: 'أخبار Google · قرى العسيرات', url: googleNews('مطلوب "أولاد حمزة" OR "عوامر العسيرات" OR "النويرات" سوهاج') },
  { name: 'وظائف مفهرسة · فرصنا', url: 'https://www.bing.com/search?q=' + encodeURIComponent('site:forasna.com/job/p/ سوهاج وظائف') + '&format=rss&setlang=ar-eg&cc=eg' },
  { name: 'فيسبوك العام · نتائج مفهرسة', url: 'https://www.bing.com/search?q=' + encodeURIComponent('site:facebook.com/groups/ سوهاج وظائف مطلوب') + '&format=rss&setlang=ar-eg&cc=eg' },
];

function plain(value: string, limit: number) {
  return value.replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}
function decode(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, raw) => {
      const code = raw.toLowerCase().startsWith('x') ? parseInt(raw.slice(1), 16) : parseInt(raw, 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }).replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, (entity) => ({
      '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ',
    })[entity] || entity);
}
function field(xml: string, tag: string) {
  return decode(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(xml)?.[1] || '').trim();
}
function norm(value: string) {
  return value.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/[ةه]/g, 'ه').replace(/ى/g, 'ي').replace(/[\u064b-\u065f\u0670]/g, '');
}
function placeFor(value: string) {
  const text = norm(value).replace(/دارالسلام/g, 'دار السلام');
  if (!text.includes('سوهاج') && !text.includes('العسيرات')) return '';
  if (/(دار السلام.{0,12}القاهره|القاهره.{0,12}دار السلام)/.test(text) && !text.includes('سوهاج')) return '';
  const local = PLACES.find((place) => text.includes(norm(place)));
  const centers = CENTERS.filter((place) => text.includes(norm(place)) && !CENTERS.some((other) => other !== place && norm(other).includes(norm(place)) && text.includes(norm(other))));
  const osairat = text.includes('العسيرات');
  if (centers.length > 1 || (centers.length && (local || osairat))) return 'محافظة سوهاج';
  if (local) return local;
  if (osairat) return 'مركز العسيرات';
  if (centers.length) return centers[0];
  return /(?:مدينه|مركز) سوهاج/.test(text) ? 'سوهاج' : 'محافظة سوهاج';
}
function safeUrl(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; }
  catch { return ''; }
}
function readRss(xml: string, sourceName: string) {
  const now = Date.now();
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0, 40).flatMap((match) => {
    const item = match[1];
    const title = plain(decode(field(item, 'title')), 160);
    const snippet = plain(decode(field(item, 'description')), 500);
    const url = safeUrl(field(item, 'link'));
    const date = new Date(field(item, 'pubDate'));
    const age = now - date.getTime();
    const text = norm(`${title} ${snippet}`);
    const locationEvidence = `${title} ${snippet.slice(0, 260)}`;
    if (!url || title.length < 5 || !Number.isFinite(age) || age < -86_400_000 || age > 14 * 86_400_000) return [];
    if (!/(وظيف|توظيف|مطلوب|تعيين|فرص عمل|فرصه عمل|شاغر|انضم)/.test(text)) return [];
    if (/(دوره تدريبيه|منحه دراسيه|نتائج التقديم|نتيجه مسابقه)/.test(text)) return [];
    const village = placeFor(locationEvidence);
    if (!village) return [];
    const source = plain(field(item, 'source'), 120) || sourceName;
    const excerpt = snippet.slice(0, 210);
    const description = excerpt.length >= 20
      ? `${excerpt}${snippet.length > excerpt.length ? '…' : ''} راجع المصدر الأصلي للتفاصيل والتقديم، وتأكد أن الفرصة ما زالت متاحة.`
      : `إعلان فرصة عمل في ${village}؛ راجع الإعلان الأصلي للشروط وطريقة التقديم والتأكد من أنه ما زال متاحًا.`;
    const published = new Date(Math.min(date.getTime(), now));
    return [{
      kind: 'offer', origin: 'external', title, organization: source, village,
      field: 'وظائف محلية', description, contact_kind: 'link', contact_value: url,
      source_name: source, source_url: url, status: 'approved', published_at: published.toISOString(),
      expires_at: new Date(published.getTime() + 14 * 86_400_000).toISOString(),
    }];
  });
}
async function scan(feed: { name: string; url: string }) {
  try {
    const response = await fetch(feed.url, {
      signal: AbortSignal.timeout(8500),
      headers: { 'User-Agent': 'AlOsairatDirectory/1.0 (+https://usayrat.online/jobs)' },
    });
    if (!response.ok) return { ok: false, jobs: [] };
    const xml = (await response.text()).slice(0, 350_000);
    if (!xml.includes('<item')) return { ok: false, jobs: [] };
    return { ok: true, jobs: readRss(xml, feed.name) };
  } catch { return { ok: false, jobs: [] }; }
}
function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
async function authorized(request: Request) {
  const token = request.headers.get('x-news-cron-token')?.trim() || '';
  if (token.length < 32 || token.length > 256) return false;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
  const hash = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  let difference = 0;
  for (let index = 0; index < hash.length; index++) difference |= hash.charCodeAt(index) ^ EXPECTED_TOKEN_SHA256.charCodeAt(index);
  return difference === 0;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST' || request.headers.get('origin') || !await authorized(request)) {
    return reply({ ok: false }, 403);
  }
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return reply({ ok: false, error: 'unavailable' }, 503);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const checkedAt = new Date();
  const cutoff = new Date(checkedAt.getTime() - 25 * 60_000).toISOString();
  const { data: claim, error: claimError } = await db.from('osairat_job_feed_state')
    .update({ last_attempt_at: checkedAt.toISOString() }).eq('id', 1).lt('last_attempt_at', cutoff).select('id');
  if (claimError) return reply({ ok: false, error: 'state_unavailable' }, 503);
  if (!claim?.length) return reply({ ok: true, skipped: true });

  const scans = await Promise.all(feeds.map(scan));
  const jobs = [...new Map(scans.flatMap((item) => item.jobs).map((item) => [item.source_url, item])).values()];
  const { data: saved, error: saveError } = jobs.length
    ? await db.from('osairat_jobs').upsert(jobs, { onConflict: 'source_url', ignoreDuplicates: true }).select('id')
    : { data: [], error: null };
  const successes = scans.filter((item) => item.ok).length;
  await db.from('osairat_job_feed_state').update({
    last_checked_at: checkedAt.toISOString(), successful_feeds: successes, latest_added: saveError ? 0 : saved?.length || 0,
  }).eq('id', 1);
  if (saveError) return reply({ ok: false, error: 'save_failed' }, 503);
  return reply({ ok: true, successfulFeeds: successes, added: saved?.length || 0 });
});
