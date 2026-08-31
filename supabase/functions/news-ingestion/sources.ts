export type NewsTopic =
  "خدمات وتنمية" | "الصحة" | "التعليم" | "المجتمع" | "أخبار وحوادث";

export type SourceNewsDigest = {
  kind: "source-digest";
  lead: string;
  excerpts: string[];
  preparedAt: string;
};

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
  origin: "live" | "archive";
};

export type LocalNewsFeed = {
  items: LocalNewsItem[];
  liveItemCount: number;
  connectedSourceCount: number;
  totalSourceCount: number;
};

type FeedSource = {
  id: string;
  name: string;
  url: string;
  sourceUrl: string;
  allowedHosts: string[];
  format: "rss" | "youm7-tag";
};

type RawNewsItem = {
  title: string;
  summary?: string;
  url: string;
  publishedAt: string;
};

const REQUEST_TIMEOUT_MS = 12_000;
const MAX_ITEM_AGE_MS = 1000 * 60 * 60 * 24 * 730;
const MAX_SOURCE_TEXT_LENGTH = 24_000;

// Health intentionally measures direct publisher feeds only. Aggregators/fallback
// discovery layers must not inflate or degrade the publisher-health counter.
const newsSources: FeedSource[] = [
  {
    id: "youm7-usayrat",
    name: "اليوم السابع",
    url: "https://www.youm7.com/Tags/Index?id=216794&tag=%D8%A7%D9%84%D8%B9%D8%B3%D9%8A%D8%B1%D8%A7%D8%AA",
    sourceUrl:
      "https://www.youm7.com/Tags/Index?id=216794&tag=%D8%A7%D9%84%D8%B9%D8%B3%D9%8A%D8%B1%D8%A7%D8%AA",
    allowedHosts: ["www.youm7.com", "youm7.com"],
    format: "youm7-tag",
  },
  {
    id: "youm7-governorates",
    name: "اليوم السابع",
    url: "https://www.youm7.com/rss/SectionRss?SectionID=296",
    sourceUrl: "https://www.youm7.com/rss/rss",
    allowedHosts: ["www.youm7.com", "youm7.com"],
    format: "rss",
  },
  {
    id: "almasryalyoum",
    name: "المصري اليوم",
    url: "https://www.almasryalyoum.com/rss/rssfeed?homePage=true",
    sourceUrl: "https://www.almasryalyoum.com/rss",
    allowedHosts: ["www.almasryalyoum.com", "almasryalyoum.com"],
    format: "rss",
  },
];

const archivedNews: LocalNewsItem[] = [
  {
    id: "archive-almasryalyoum-4335488",
    title:
      "كاميرات مراقبة وخلافات جيرة.. كشف حقيقة ادعاء تواطؤ عاملين بشرطة العسيرات مع مواطن بسوهاج",
    summary:
      "متابعة لبيان رسمي بشأن شكوى محلية والإجراءات القانونية التي اتُخذت بعد فحص الواقعة.",
    url: "https://www.almasryalyoum.com/news/details/4335488",
    source: "المصري اليوم",
    sourceUrl: "https://www.almasryalyoum.com/rss",
    publishedAt: "2026-08-11T14:05:00.000Z",
    village: "مركز العسيرات",
    topic: "أخبار وحوادث",
    origin: "archive",
  },
];

const villages = [
  "جزيرة أولاد حمزة",
  "أولاد حمزة",
  "الرشايدة",
  "الأحايوة غرب",
  "النويرات",
  "عوامر العسيرات",
  "أولاد جبارة",
  "المساعيد",
  "أولاد بهيج",
];

function normalizeArabic(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    nbsp: " ",
    laquo: "«",
    raquo: "»",
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      const point = Number.parseInt(code.slice(2), 16);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }
    if (code.startsWith("#")) {
      const point = Number.parseInt(code.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }
    return named[code.toLowerCase()] ?? entity;
  });
}

function cleanText(value = "") {
  return decodeEntities(value)
    .replace(/^\s*<!\[CDATA\[/, "")
    .replace(/\]\]>\s*$/, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readTag(block: string, tag: string) {
  return cleanText(
    block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] || "",
  );
}

function readAttribute(tag: string, attribute: string) {
  return decodeEntities(
    tag
      .match(
        new RegExp(
          `\\s${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
          "i",
        ),
      )
      ?.slice(1)
      .find(Boolean) || "",
  );
}

function safeUrl(value: string, hosts: string[], base?: string) {
  try {
    const url = new URL(decodeEntities(value), base);
    if (url.protocol !== "https:" || !hosts.includes(url.hostname.toLowerCase())) return "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function stableId(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1)
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  return (hash >>> 0).toString(36);
}

function detectVillage(value: string) {
  const normalized = normalizeArabic(value);
  return villages.find((name) => normalized.includes(normalizeArabic(name))) || "مركز العسيرات";
}

function detectTopic(value: string): NewsTopic {
  const normalized = normalizeArabic(value);
  if (["صحه", "مستشفي", "طبي", "علاج", "صيدليه", "تسمم"].some((term) => normalized.includes(term)))
    return "الصحة";
  if (["تعليم", "مدرسه", "ازهر", "امتحان", "طلاب", "معهد"].some((term) => normalized.includes(term)))
    return "التعليم";
  if (["محافظ", "رصف", "طريق", "مياه", "صرف", "كهرباء", "مشروع", "تطوير", "تموين"].some((term) => normalized.includes(term)))
    return "خدمات وتنمية";
  if (["اهالي", "شباب", "جمعيه", "احتفال", "مبادره"].some((term) => normalized.includes(term)))
    return "المجتمع";
  return "أخبار وحوادث";
}

function isRelevant(item: RawNewsItem, source: FeedSource) {
  if (source.format === "youm7-tag") return true;
  const normalized = normalizeArabic(`${item.title} ${item.summary || ""}`);
  return normalized.includes("العسيرات") || normalized.includes("عسيرات");
}

function parseRss(xml: string, source: FeedSource): RawNewsItem[] {
  return (xml.match(/<item\b[\s\S]*?<\/item>/gi) || []).flatMap((block) => {
    const title = readTag(block, "title");
    const url = safeUrl(readTag(block, "link"), source.allowedHosts);
    const date = readTag(block, "pubDate") || readTag(block, "date");
    const timestamp = Date.parse(date);
    const summary = readTag(block, "description");
    if (!title || !url || !Number.isFinite(timestamp)) return [];
    return [
      {
        title,
        url,
        publishedAt: new Date(timestamp).toISOString(),
        ...(summary ? { summary } : {}),
      },
    ];
  });
}

function parseYoum7Tag(html: string, source: FeedSource): RawNewsItem[] {
  const starts = [
    ...html.matchAll(/<div\b[^>]*class=["'][^"']*\bbigOneSec\b[^"']*["'][^>]*>/gi),
  ];
  return starts.flatMap((match, index) => {
    const block = html.slice(match.index ?? 0, starts[index + 1]?.index ?? html.length);
    const heading = block.match(/<h3\b[^>]*>[\s\S]*?<\/h3>/i)?.[0] || "";
    const anchor = heading.match(/<a\b[^>]*>[\s\S]*?<\/a>/i)?.[0] || "";
    const url = safeUrl(readAttribute(anchor, "href"), source.allowedHosts, source.url);
    const title = cleanText(anchor);
    const summary = cleanText(block.match(/<p\b[^>]*>[\s\S]*?<\/p>/i)?.[0] || "");
    const dateMatch = url.match(/\/story\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
    if (!title || !url || !dateMatch) return [];
    return [
      {
        title,
        url,
        publishedAt: new Date(
          Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]), 12),
        ).toISOString(),
        ...(summary ? { summary } : {}),
      },
    ];
  });
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchSourceBody(source: FeedSource) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(source.url, {
        headers: {
          accept:
            source.format === "rss"
              ? "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5"
              : "text/html, application/xhtml+xml;q=0.9, */*;q=0.5",
          "user-agent": "UsayratDirectoryNewsMonitor/1.0 (+https://usayrat.online/news)",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) return response.text();
      lastError = new Error(`News source ${source.id} returned ${response.status}`);
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 408 &&
        response.status !== 429
      )
        break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < 2) await sleep(attempt === 0 ? 300 : 900);
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`News source ${source.id} failed`);
}

async function fetchSource(source: FeedSource): Promise<LocalNewsItem[]> {
  const body = await fetchSourceBody(source);
  const rawItems =
    source.format === "youm7-tag" ? parseYoum7Tag(body, source) : parseRss(body, source);
  const cutoff = Date.now() - MAX_ITEM_AGE_MS;
  return rawItems
    .filter((item) => Date.parse(item.publishedAt) >= cutoff)
    .filter((item) => isRelevant(item, source))
    .map((item) => ({
      id: `${source.id}-${stableId(item.url)}`,
      title: item.title,
      ...(item.summary ? { summary: item.summary } : {}),
      url: item.url,
      source: source.name,
      sourceUrl: source.sourceUrl,
      publishedAt: item.publishedAt,
      village: detectVillage(`${item.title} ${item.summary || ""}`),
      topic: detectTopic(`${item.title} ${item.summary || ""}`),
      origin: "live" as const,
    }));
}

function dedupe(items: LocalNewsItem[]) {
  const urls = new Set<string>();
  const titles = new Set<string>();
  return items.filter((item) => {
    const title = normalizeArabic(item.title);
    if (urls.has(item.url) || titles.has(title)) return false;
    urls.add(item.url);
    titles.add(title);
    return true;
  });
}

export async function collectLocalNewsFromSources(limit = 80): Promise<LocalNewsFeed> {
  const settled = await Promise.allSettled(newsSources.map(fetchSource));
  settled.forEach((result, index) => {
    if (result.status === "rejected") {
      console.warn("[news-source] failed", {
        source: newsSources[index].id,
        message:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason).slice(0, 180),
      });
    }
  });
  const live = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  const items = dedupe([...live, ...archivedNews])
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
    .slice(0, limit);
  return {
    items,
    liveItemCount: live.length,
    connectedSourceCount: settled.filter((result) => result.status === "fulfilled").length,
    totalSourceCount: newsSources.length,
  };
}

function isUsefulExcerpt(value: string) {
  return value.length >= 55 && (value.match(/[\u0600-\u06ff]/g)?.length || 0) >= 25;
}

export function buildSourceNewsDigest(
  item: Pick<LocalNewsItem, "title" | "summary"> & {
    sourceExcerpt?: string;
    sourceText?: string;
  },
  preparedAt = new Date().toISOString(),
): SourceNewsDigest {
  const lead = cleanText(item.sourceExcerpt || item.summary || item.title).slice(0, 420);
  const excerpts = (item.sourceText || "")
    .split(/\n{2,}|(?<=[.!؟])\s+/u)
    .map(cleanText)
    .filter(isUsefulExcerpt)
    .slice(0, 3)
    .map((value) => value.slice(0, 220));
  return { kind: "source-digest", lead, excerpts, preparedAt };
}

function parseDescription(html: string) {
  const tags = html.slice(0, 1_500_000).match(/<meta\b[^>]*>/gi) || [];
  for (const key of ["og:description", "twitter:description", "description"]) {
    const tag = tags.find(
      (candidate) =>
        (readAttribute(candidate, "property") || readAttribute(candidate, "name")).toLowerCase() === key,
    );
    const value = cleanText(tag ? readAttribute(tag, "content") : "");
    if (value.length >= 40) return value.slice(0, 900);
  }
  return "";
}

function parseArticleText(html: string) {
  const scripts =
    html
      .slice(0, 4_000_000)
      .match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  const bodies: string[] = [];
  for (const script of scripts) {
    try {
      const value = JSON.parse(
        script.replace(/^<script\b[^>]*>/i, "").replace(/<\/script>$/i, ""),
      );
      const walk = (entry: unknown): void => {
        if (Array.isArray(entry)) return entry.forEach(walk);
        if (!entry || typeof entry !== "object") return;
        const record = entry as Record<string, unknown>;
        if (typeof record.articleBody === "string" && record.articleBody.length >= 300)
          bodies.push(cleanText(record.articleBody));
        Object.values(record).forEach(walk);
      };
      walk(value);
    } catch {
      // Ignore invalid publisher JSON-LD blocks.
    }
  }
  return bodies.sort((left, right) => right.length - left.length)[0]?.slice(0, MAX_SOURCE_TEXT_LENGTH) || "";
}

export async function fetchSourceDetail(item: LocalNewsItem) {
  try {
    const response = await fetch(item.url, {
      headers: {
        accept: "text/html, application/xhtml+xml;q=0.9, */*;q=0.5",
        "user-agent": "UsayratDirectoryNewsMonitor/1.0 (+https://usayrat.online/news)",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return { sourceExcerpt: item.summary || "" };
    const html = await response.text();
    const sourceExcerpt = parseDescription(html) || item.summary || "";
    const sourceText = parseArticleText(html);
    return {
      ...(sourceExcerpt ? { sourceExcerpt } : {}),
      ...(sourceText ? { sourceText } : {}),
    };
  } catch {
    return { sourceExcerpt: item.summary || "" };
  }
}
