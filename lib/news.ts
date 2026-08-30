import { cache } from 'react';
import { villages } from './data/base';
import { normalizeArabic } from './site';

export type NewsTopic = 'خدمات وتنمية' | 'الصحة' | 'التعليم' | 'المجتمع' | 'أخبار وحوادث';

export type LocalNewsItem = {
  id: string;
  title: string;
  summary?: string;
  url: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  village: string;
  topic: NewsTopic;
  origin: 'live' | 'archive';
  editorial?: {
    rights: 'owned' | 'licensed';
    author: string;
    updatedAt: string;
    body: string[];
  };
};

export type LocalNewsDetail = LocalNewsItem & {
  sourceExcerpt?: string;
};

export type LocalNewsFeed = {
  items: LocalNewsItem[];
  liveItemCount: number;
  connectedSourceCount: number;
  totalSourceCount: number;
  checkedAt: string;
};

type FeedSource = {
  id: string;
  name: string;
  url: string;
  sourceUrl: string;
  allowedHosts: string[];
  format: 'rss' | 'youm7-tag';
};

type RawNewsItem = {
  title: string;
  summary?: string;
  url: string;
  publishedAt: string;
};

const NEWS_REVALIDATE_SECONDS = 1800;
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_ITEM_AGE_MS = 1000 * 60 * 60 * 24 * 730;

const newsSources: FeedSource[] = [
  {
    id: 'youm7-usayrat',
    name: 'اليوم السابع',
    url: 'https://www.youm7.com/Tags/Index?id=216794&tag=%D8%A7%D9%84%D8%B9%D8%B3%D9%8A%D8%B1%D8%A7%D8%AA',
    sourceUrl: 'https://www.youm7.com/Tags/Index?id=216794&tag=%D8%A7%D9%84%D8%B9%D8%B3%D9%8A%D8%B1%D8%A7%D8%AA',
    allowedHosts: ['www.youm7.com', 'youm7.com'],
    format: 'youm7-tag',
  },
  {
    id: 'youm7-governorates',
    name: 'اليوم السابع',
    url: 'https://www.youm7.com/rss/SectionRss?SectionID=296',
    sourceUrl: 'https://www.youm7.com/rss/rss',
    allowedHosts: ['www.youm7.com', 'youm7.com'],
    format: 'rss',
  },
  {
    id: 'almasryalyoum',
    name: 'المصري اليوم',
    url: 'https://www.almasryalyoum.com/rss/rssfeed?homePage=true',
    sourceUrl: 'https://www.almasryalyoum.com/rss',
    allowedHosts: ['www.almasryalyoum.com', 'almasryalyoum.com'],
    format: 'rss',
  },
  {
    id: 'azhar',
    name: 'الأزهر الشريف',
    url: 'https://azhar.eg/alazhar/allnews/ctl/rss/mid/3414',
    sourceUrl: 'https://azhar.eg/alazhar/allnews',
    allowedHosts: ['azhar.eg', 'www.azhar.eg'],
    format: 'rss',
  },
];

export const newsSourceCatalog = [
  {
    name: 'اليوم السابع',
    type: 'صفحة موضوع محلية + RSS رسمي',
    url: 'https://www.youm7.com/Tags/Index?id=216794&tag=%D8%A7%D9%84%D8%B9%D8%B3%D9%8A%D8%B1%D8%A7%D8%AA',
  },
  {
    name: 'المصري اليوم',
    type: 'RSS رسمي مجاني',
    url: 'https://www.almasryalyoum.com/rss',
  },
  {
    name: 'الأزهر الشريف',
    type: 'RSS رسمي',
    url: 'https://azhar.eg/alazhar/allnews',
  },
] as const;

const archivedNews: LocalNewsItem[] = [
  {
    id: 'archive-almasryalyoum-4335488',
    title: 'كاميرات مراقبة وخلافات جيرة.. كشف حقيقة ادعاء تواطؤ عاملين بشرطة العسيرات مع مواطن بسوهاج',
    summary: 'متابعة لبيان رسمي بشأن شكوى محلية والإجراءات القانونية التي اتُخذت بعد فحص الواقعة.',
    url: 'https://www.almasryalyoum.com/news/details/4335488',
    source: 'المصري اليوم',
    sourceUrl: 'https://www.almasryalyoum.com/rss',
    publishedAt: '2026-08-11T14:05:00.000Z',
    village: 'مركز العسيرات',
    topic: 'أخبار وحوادث',
    origin: 'archive',
  },
  {
    id: 'archive-youm7-7468253',
    title: 'زيارة مفاجئة لمديرية الصحة بسوهاج لمستشفى العسيرات والمنشاة لمتابعة العمل',
    summary: 'جولة رقابية لمتابعة انتظام العمل والخدمات وسياسات مكافحة العدوى وسلامة المرضى.',
    url: 'https://www.youm7.com/story/2026/7/2/%D8%B2%D9%8A%D8%A7%D8%B1%D8%A9-%D9%85%D9%81%D8%A7%D8%AC%D8%A6%D8%A9-%D9%84%D9%85%D8%AF%D9%8A%D8%B1%D9%8A%D8%A9-%D8%A7%D9%84%D8%B5%D8%AD%D8%A9-%D8%A8%D8%B3%D9%88%D9%87%D8%A7%D8%AC-%D9%84%D9%85%D8%B3%D8%AA%D8%B4%D9%81%D9%89-%D8%A7%D9%84%D8%B9%D8%B3%D9%8A%D8%B1%D8%A7%D8%AA-%D9%88%D8%A7%D9%84%D9%85%D9%86%D8%B4%D8%A7%D8%A9-%D9%84%D9%85%D8%AA%D8%A7%D8%A8%D8%B9%D8%A9-%D8%A7%D9%84%D8%B9%D9%85%D9%84/7468253',
    source: 'اليوم السابع',
    sourceUrl: 'https://www.youm7.com/rss/rss',
    publishedAt: '2026-07-02T07:16:00.000Z',
    village: 'مركز العسيرات',
    topic: 'الصحة',
    origin: 'archive',
  },
  {
    id: 'archive-youm7-7463817',
    title: 'رئيس منطقة سوهاج الأزهرية يتفقد لجان العسيرات ويطمئن على سير امتحان الجغرافيا',
    summary: 'متابعة ميدانية للجان الامتحانات بمركز العسيرات والاطمئنان على انتظامها.',
    url: 'https://www.youm7.com/story/2026/6/28/%D8%B1%D8%A6%D9%8A%D8%B3-%D9%85%D9%86%D8%B7%D9%82%D8%A9-%D8%B3%D9%88%D9%87%D8%A7%D8%AC-%D8%A7%D9%84%D8%A3%D8%B2%D9%87%D8%B1%D9%8A%D8%A9-%D9%8A%D8%AA%D9%81%D9%82%D8%AF-%D9%84%D8%AC%D8%A7%D9%86-%D8%A7%D9%84%D8%B9%D8%B3%D9%8A%D8%B1%D8%A7%D8%AA-%D9%88%D9%8A%D8%B7%D9%85%D8%A6%D9%86-%D8%B9%D9%84%D9%89-%D8%B3%D9%8A%D8%B1/7463817',
    source: 'اليوم السابع',
    sourceUrl: 'https://www.youm7.com/rss/rss',
    publishedAt: '2026-06-28T10:10:00.000Z',
    village: 'مركز العسيرات',
    topic: 'التعليم',
    origin: 'archive',
  },
  {
    id: 'archive-youm7-7320784',
    title: 'صحة سوهاج تواصل حملتها على مركز العسيرات وضبط منشأة غير مرخصة',
    summary: 'حملة تفتيش على منشآت صحية خاصة للتأكد من الترخيص والالتزام بالاشتراطات.',
    url: 'https://www.youm7.com/story/2026/2/27/%D8%B5%D8%AD%D8%A9-%D8%B3%D9%88%D9%87%D8%A7%D8%AC-%D8%AA%D9%88%D8%A7%D8%B5%D9%84-%D8%AD%D9%85%D9%84%D8%AA%D9%87%D8%A7-%D8%B9%D9%84%D9%89-%D9%85%D8%B1%D9%83%D8%B2-%D8%A7%D9%84%D8%B9%D8%B3%D9%8A%D8%B1%D8%A7%D8%AA-%D9%88%D8%B6%D8%A8%D8%B7-%D9%85%D9%86%D8%B4%D8%A3%D8%A9-%D8%BA%D9%8A%D8%B1/7320784',
    source: 'اليوم السابع',
    sourceUrl: 'https://www.youm7.com/rss/rss',
    publishedAt: '2026-02-27T10:37:00.000Z',
    village: 'مركز العسيرات',
    topic: 'الصحة',
    origin: 'archive',
  },
  {
    id: 'archive-almasryalyoum-4203727',
    title: 'تطورات الحالة الصحية لمصابي التسمم بالبوظة في سوهاج وإجراءات قانونية بحق البائع',
    summary: 'متابعة الحالة الصحية لعشرات المصابين من أهالي العسيرات والإجراءات الرقابية والقانونية المرتبطة بالواقعة.',
    url: 'https://www.almasryalyoum.com/news/details/4203727',
    source: 'المصري اليوم',
    sourceUrl: 'https://www.almasryalyoum.com/rss',
    publishedAt: '2026-02-20T12:02:00.000Z',
    village: 'مركز العسيرات',
    topic: 'الصحة',
    origin: 'archive',
  },
];

const topicRules: Array<{ topic: NewsTopic; terms: string[] }> = [
  { topic: 'الصحة', terms: ['صحه', 'مستشفي', 'طبي', 'علاج', 'مرض', 'قافله طبيه', 'صيدليه', 'تسمم'] },
  { topic: 'التعليم', terms: ['تعليم', 'مدرسه', 'ازهر', 'امتحان', 'طلاب', 'جامعه', 'معهد'] },
  { topic: 'خدمات وتنمية', terms: ['محافظ', 'رصف', 'طريق', 'مياه', 'صرف', 'كهرباء', 'مشروع', 'تطوير', 'تموين', 'زراعه'] },
  { topic: 'المجتمع', terms: ['انتخابات', 'مبادره', 'اهالي', 'شباب', 'جمعيه', 'احتفال', 'ثقافه'] },
];

const directAreaTerms = ['العسيرات', 'عسيرات'];
const contextTerms = ['العسيرات', 'سوهاج'];
const primaryVillages = villages.filter((village) => village.name !== 'مركز العسيرات');

function decodeEntities(value: string) {
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
  const withoutCdata = value.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '');
  const withoutMarkup = withoutCdata.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ');
  return decodeEntities(withoutMarkup)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const shortened = value.slice(0, maxLength + 1).replace(/\s+\S*$/, '').trim();
  return `${shortened || value.slice(0, maxLength).trim()}…`;
}

function readXmlTag(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return cleanText(match?.[1] || '');
}

function safeExternalUrl(value: string, allowedHosts: string[]) {
  try {
    const url = new URL(decodeEntities(value));
    if (url.protocol !== 'https:' || !allowedHosts.includes(url.hostname.toLowerCase())) return '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function parsePublishedAt(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function parseDateFromYoum7Url(url: string) {
  const match = url.match(/\/story\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
  if (!match) return '';
  const [, year, month, day] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function parseRss(xml: string, source: FeedSource): RawNewsItem[] {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  return blocks.flatMap((block) => {
    const title = truncate(readXmlTag(block, 'title'), 220);
    const url = safeExternalUrl(readXmlTag(block, 'link'), source.allowedHosts);
    const publishedAt = parsePublishedAt(readXmlTag(block, 'pubDate') || readXmlTag(block, 'date'));
    const summary = truncate(readXmlTag(block, 'description'), 260);
    if (!title || !url || !publishedAt) return [];
    return [{ title, url, publishedAt, ...(summary ? { summary } : {}) }];
  });
}

function parseYoum7TagPage(html: string, source: FeedSource): RawNewsItem[] {
  const scripts = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  const script = scripts.find((candidate) => candidate.includes('CollectionPage') && candidate.includes('itemListElement'));
  if (!script) return [];

  const payload = script.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '').trim();

  try {
    const parsed = JSON.parse(payload) as {
      mainEntity?: { itemListElement?: Array<{ url?: unknown; name?: unknown }> };
    };
    const entries = parsed.mainEntity?.itemListElement;
    if (!Array.isArray(entries)) return [];

    return entries.flatMap((entry) => {
      const title = truncate(cleanText(typeof entry.name === 'string' ? entry.name : ''), 220);
      const url = safeExternalUrl(typeof entry.url === 'string' ? entry.url : '', source.allowedHosts);
      const publishedAt = parseDateFromYoum7Url(url);
      if (!title || !url || !publishedAt) return [];
      return [{ title, url, publishedAt }];
    });
  } catch {
    return [];
  }
}

function readHtmlAttribute(tag: string, attribute: string) {
  const match = tag.match(new RegExp(`\\s${attribute}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, 'i'));
  return decodeEntities(match?.[1] || match?.[2] || match?.[3] || '');
}

function parsePageDescription(html: string) {
  const metaTags = html.slice(0, 1_500_000).match(/<meta\b[^>]*>/gi) || [];
  const preferredKeys = ['og:description', 'twitter:description', 'description'];

  for (const key of preferredKeys) {
    const tag = metaTags.find((candidate) => {
      const label = readHtmlAttribute(candidate, 'property') || readHtmlAttribute(candidate, 'name');
      return label.toLowerCase() === key;
    });
    const value = cleanText(tag ? readHtmlAttribute(tag, 'content') : '');
    if (value.length >= 40) return truncate(value, 900);
  }

  return '';
}

function isRelevant(raw: RawNewsItem, source: FeedSource) {
  if (source.format === 'youm7-tag') return true;
  const normalized = normalizeArabic(`${raw.title} ${raw.summary || ''}`);
  if (directAreaTerms.some((term) => normalized.includes(normalizeArabic(term)))) return true;
  const hasLocalContext = contextTerms.some((term) => normalized.includes(normalizeArabic(term)));
  return hasLocalContext && primaryVillages.some((village) => normalized.includes(normalizeArabic(village.name)));
}

function detectVillage(value: string) {
  const normalized = normalizeArabic(value);
  const village = primaryVillages
    .toSorted((a, b) => b.name.length - a.name.length)
    .find((candidate) => {
      const candidateName = normalizeArabic(candidate.name);
      if (!normalized.includes(candidateName)) return false;
      if (candidate.name === 'الشهداء') return normalized.includes(`قريه ${candidateName}`);
      return true;
    });

  return village?.name || 'مركز العسيرات';
}

function detectTopic(value: string): NewsTopic {
  const normalized = normalizeArabic(value);
  return topicRules.find((rule) => rule.terms.some((term) => normalized.includes(term)))?.topic || 'أخبار وحوادث';
}

function stableId(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  return (hash >>> 0).toString(36);
}

function toLocalNewsItem(raw: RawNewsItem, source: FeedSource): LocalNewsItem {
  const text = `${raw.title} ${raw.summary || ''}`;
  return {
    id: `${source.id}-${stableId(raw.url)}`,
    title: raw.title,
    ...(raw.summary ? { summary: raw.summary } : {}),
    url: raw.url,
    source: source.name,
    sourceUrl: source.sourceUrl,
    publishedAt: raw.publishedAt,
    village: detectVillage(text),
    topic: detectTopic(text),
    origin: 'live',
  };
}

const fetchSource = cache(async function fetchSource(source: FeedSource) {
  const response = await fetch(source.url, {
    headers: {
      accept: source.format === 'rss'
        ? 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5'
        : 'text/html, application/xhtml+xml;q=0.9, */*;q=0.5',
      'user-agent': 'UsayratDirectoryNewsMonitor/1.0 (+https://usayrat.online/news)',
    },
    next: { revalidate: NEWS_REVALIDATE_SECONDS, tags: ['local-news'] },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`News source ${source.id} returned ${response.status}`);
  const body = await response.text();
  const rawItems = source.format === 'rss' ? parseRss(body, source) : parseYoum7TagPage(body, source);
  const cutoff = Date.now() - MAX_ITEM_AGE_MS;

  return rawItems
    .filter((item) => new Date(item.publishedAt).getTime() >= cutoff)
    .filter((item) => isRelevant(item, source))
    .map((item) => toLocalNewsItem(item, source));
});

function normalizedHeadline(item: LocalNewsItem) {
  return normalizeArabic(item.title)
    .replace(/\b(صور|فيديو|تفاصيل|اعرف)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function deduplicate(items: LocalNewsItem[]) {
  const urls = new Set<string>();
  const headlines = new Set<string>();
  const unique: LocalNewsItem[] = [];

  for (const item of items) {
    const headline = normalizedHeadline(item);
    if (urls.has(item.url) || headlines.has(headline)) continue;
    urls.add(item.url);
    headlines.add(headline);
    unique.push(item);
  }

  return unique;
}

export async function getLocalNews(limit = 36): Promise<LocalNewsFeed> {
  const settled = await Promise.allSettled(newsSources.map((source) => fetchSource(source)));
  const liveItems = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  const merged = deduplicate([...liveItems, ...archivedNews])
    .toSorted((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);

  return {
    items: merged,
    liveItemCount: liveItems.length,
    connectedSourceCount: settled.filter((result) => result.status === 'fulfilled').length,
    totalSourceCount: newsSources.length,
    checkedAt: new Date().toISOString(),
  };
}

export function newsItemPath(item: Pick<LocalNewsItem, 'id'> | string) {
  const id = typeof item === 'string' ? item : item.id;
  return `/news/${encodeURIComponent(id)}`;
}

function sourceForItem(item: LocalNewsItem) {
  try {
    const hostname = new URL(item.url).hostname.toLowerCase();
    return newsSources.find((source) => source.allowedHosts.includes(hostname));
  } catch {
    return undefined;
  }
}

async function fetchSourceExcerpt(item: LocalNewsItem) {
  if (item.editorial?.body.length) return '';
  const source = sourceForItem(item);
  if (!source || !safeExternalUrl(item.url, source.allowedHosts)) return item.summary || '';

  try {
    const response = await fetch(item.url, {
      headers: {
        accept: 'text/html, application/xhtml+xml;q=0.9, */*;q=0.5',
        'user-agent': 'UsayratDirectoryNewsMonitor/1.0 (+https://usayrat.online/news)',
      },
      next: { revalidate: NEWS_REVALIDATE_SECONDS, tags: ['local-news'] },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) return item.summary || '';
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('text/html')) return item.summary || '';
    const description = parsePageDescription(await response.text());
    return description || item.summary || '';
  } catch {
    return item.summary || '';
  }
}

const loadLocalNewsItem = async (id: string): Promise<LocalNewsDetail | undefined> => {
  if (!/^[a-z0-9-]{1,120}$/i.test(id)) return undefined;

  let item = archivedNews.find((candidate) => candidate.id === id);

  if (!item) {
    const source = newsSources.find((candidate) => id.startsWith(`${candidate.id}-`));
    if (!source) return undefined;

    try {
      item = (await fetchSource(source)).find((candidate) => candidate.id === id);
    } catch {
      return undefined;
    }
  }

  if (!item) return undefined;
  const sourceExcerpt = await fetchSourceExcerpt(item);
  return { ...item, ...(sourceExcerpt ? { sourceExcerpt } : {}) };
};

export const getLocalNewsItem = cache(loadLocalNewsItem);

export function isFullNewsArticle(item: LocalNewsItem) {
  return Boolean(item.editorial?.body.length && item.editorial.body.join(' ').trim().length >= 400);
}

export function selectHomepageNews(items: LocalNewsItem[], limit = 4) {
  if (items.length <= limit) return items;

  const selected: LocalNewsItem[] = [items[0]];
  const topics = new Set<NewsTopic>([items[0].topic]);

  for (const item of items.slice(1)) {
    if (selected.length >= limit) break;
    if (topics.has(item.topic)) continue;
    selected.push(item);
    topics.add(item.topic);
  }

  for (const item of items) {
    if (selected.length >= limit) break;
    if (!selected.some((candidate) => candidate.id === item.id)) selected.push(item);
  }

  return selected;
}
