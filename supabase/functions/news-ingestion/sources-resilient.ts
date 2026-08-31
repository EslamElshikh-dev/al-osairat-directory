import {
  buildSourceNewsDigest,
  collectLocalNewsFromSources as collectPrimarySources,
  fetchSourceDetail,
  type LocalNewsFeed,
  type LocalNewsItem,
} from "./sources.ts";

export { buildSourceNewsDigest, fetchSourceDetail };
export type { LocalNewsItem };

const FALLBACK_TIMEOUT_MS = 10_000;
const MAX_ITEM_AGE_MS = 1000 * 60 * 60 * 24 * 730;

const fallbackFeeds = [
  'https://news.google.com/rss/search?q=%22%D8%A7%D9%84%D8%B9%D8%B3%D9%8A%D8%B1%D8%A7%D8%AA%22&hl=ar&gl=EG&ceid=EG:ar',
  'https://news.google.com/rss/search?q=%22%D9%85%D8%B1%D9%83%D8%B2%20%D8%A7%D9%84%D8%B9%D8%B3%D9%8A%D8%B1%D8%A7%D8%AA%22&hl=ar&gl=EG&ceid=EG:ar',
  'https://news.google.com/rss/search?q=%D8%A7%D9%84%D8%B9%D8%B3%D9%8A%D8%B1%D8%A7%D8%AA%20%D8%B3%D9%88%D9%87%D8%A7%D8%AC&hl=ar&gl=EG&ceid=EG:ar',
] as const;

function decodeEntities(value = '') {
  const named: Record<string, string> = {
    amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', laquo: '«', raquo: '»',
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) {
      const point = Number.parseInt(code.slice(2), 16);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }
    if (code.startsWith('#')) {
      const point = Number.parseInt(code.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

function cleanText(value = '') {
  return decodeEntities(value)
    .replace(/^\s*<!\[CDATA\[/, '')
    .replace(/\]\]>\s*$/, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return cleanText(match?.[1] || '');
}

function readSource(block: string) {
  const match = block.match(/<source\b([^>]*)>([\s\S]*?)<\/source>/i);
  const name = cleanText(match?.[2] || '') || 'أخبار Google';
  const urlMatch = (match?.[1] || '').match(/\burl=["']([^"']+)["']/i);
  const sourceUrl = decodeEntities(urlMatch?.[1] || 'https://news.google.com/');
  return { name, sourceUrl };
}

function stableId(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  return (hash >>> 0).toString(36);
}

function normalizeArabic(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectTopic(value: string): LocalNewsItem['topic'] {
  const text = normalizeArabic(value);
  if (['صحه', 'مستشفي', 'طبي', 'علاج', 'صيدليه', 'تسمم'].some((term) => text.includes(term))) return 'الصحة';
  if (['تعليم', 'مدرسه', 'ازهر', 'امتحان', 'طلاب', 'معهد'].some((term) => text.includes(term))) return 'التعليم';
  if (['محافظ', 'رصف', 'طريق', 'مياه', 'صرف', 'كهرباء', 'مشروع', 'تطوير', 'تموين'].some((term) => text.includes(term))) return 'خدمات وتنمية';
  if (['اهالي', 'شباب', 'جمعيه', 'احتفال', 'مبادره'].some((term) => text.includes(term))) return 'المجتمع';
  return 'أخبار وحوادث';
}

function detectVillage(value: string) {
  const text = normalizeArabic(value);
  const villages = ['جزيرة أولاد حمزة', 'أولاد حمزة', 'الرشايدة', 'الأحايوة غرب', 'النويرات', 'عوامر العسيرات', 'أولاد جبارة', 'المساعيد', 'أولاد بهيج'];
  return villages.find((village) => text.includes(normalizeArabic(village))) || 'مركز العسيرات';
}

function parseGoogleNews(xml: string): LocalNewsItem[] {
  const cutoff = Date.now() - MAX_ITEM_AGE_MS;
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return blocks.flatMap((block) => {
    const title = readTag(block, 'title');
    const url = readTag(block, 'link');
    const publishedAt = readTag(block, 'pubDate');
    const summary = readTag(block, 'description');
    const timestamp = Date.parse(publishedAt);
    if (!title || !url.startsWith('https://news.google.com/') || !Number.isFinite(timestamp) || timestamp < cutoff) return [];
    const normalized = normalizeArabic(`${title} ${summary}`);
    if (!normalized.includes('العسيرات') && !normalized.includes('عسيرات')) return [];
    const source = readSource(block);
    return [{
      id: `google-news-${stableId(url)}`,
      title,
      ...(summary ? { summary } : {}),
      url,
      source: source.name,
      sourceUrl: source.sourceUrl,
      publishedAt: new Date(timestamp).toISOString(),
      village: detectVillage(`${title} ${summary}`),
      topic: detectTopic(`${title} ${summary}`),
      origin: 'live' as const,
    }];
  });
}

async function fetchFallback(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
      'user-agent': 'UsayratDirectoryNewsMonitor/1.0 (+https://usayrat.online/news)',
    },
    signal: AbortSignal.timeout(FALLBACK_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Fallback news feed returned ${response.status}`);
  return parseGoogleNews(await response.text());
}

function normalizedHeadline(item: LocalNewsItem) {
  return normalizeArabic(item.title).replace(/\b(صور|فيديو|تفاصيل|اعرف)\b/g, ' ').replace(/\s+/g, ' ').trim();
}

function deduplicate(items: LocalNewsItem[]) {
  const urls = new Set<string>();
  const headlines = new Set<string>();
  return items.filter((item) => {
    const headline = normalizedHeadline(item);
    if (urls.has(item.url) || headlines.has(headline)) return false;
    urls.add(item.url);
    headlines.add(headline);
    return true;
  });
}

export async function collectLocalNewsFromSources(limit = 80): Promise<LocalNewsFeed> {
  const [primary, fallbackSettled] = await Promise.all([
    collectPrimarySources(limit),
    Promise.allSettled(fallbackFeeds.map(fetchFallback)),
  ]);

  const fallbackItems = fallbackSettled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  const fallbackConnected = fallbackSettled.filter((result) => result.status === 'fulfilled').length;
  const items = deduplicate([...fallbackItems, ...primary.items])
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit);

  return {
    items,
    liveItemCount: items.filter((item) => item.origin === 'live').length,
    connectedSourceCount: Math.min(primary.totalSourceCount, primary.connectedSourceCount + fallbackConnected),
    totalSourceCount: primary.totalSourceCount,
  };
}
