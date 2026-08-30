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
  format: "rss" | "youm7-tag" | "azhar-zone";
  additionalPages?: number;
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

const newsSources: FeedSource[] = [
  {
    id: "youm7-usayrat",
    name: "اليوم السابع",
    url: "https://www.youm7.com/Tags/Index?id=216794&tag=%D8%A7%D9%84%D8%B9%D8%B3%D9%8A%D8%B1%D8%A7%D8%AA",
    sourceUrl:
      "https://www.youm7.com/Tags/Index?id=216794&tag=%D8%A7%D9%84%D8%B9%D8%B3%D9%8A%D8%B1%D8%A7%D8%AA",
    allowedHosts: ["www.youm7.com", "youm7.com"],
    format: "youm7-tag",
    additionalPages: 2,
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
  {
    id: "masrawy-governorates",
    name: "مصراوي",
    url: "https://www.masrawy.com/rss/feed/204/%D9%85%D8%AD%D8%A7%D9%81%D8%B8%D8%A7%D8%AA",
    sourceUrl: "https://www.masrawy.com/news/news_regions",
    allowedHosts: ["www.masrawy.com", "masrawy.com"],
    format: "rss",
  },
  {
    id: "azhar",
    name: "الأزهر الشريف",
    url: "https://azhar.eg/alazhar/allnews/ctl/rss/mid/3414",
    sourceUrl: "https://azhar.eg/alazhar/allnews",
    allowedHosts: ["azhar.eg", "www.azhar.eg"],
    format: "rss",
  },
  {
    id: "azhar-sohag-zone",
    name: "منطقة سوهاج الأزهرية",
    url: "https://azhar.eg/zones/sohag",
    sourceUrl: "https://azhar.eg/zones/sohag",
    allowedHosts: ["azhar.eg", "www.azhar.eg"],
    format: "azhar-zone",
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
  {
    id: "archive-youm7-7468253",
    title:
      "زيارة مفاجئة لمديرية الصحة بسوهاج لمستشفى العسيرات والمنشاة لمتابعة العمل",
    summary:
      "جولة رقابية لمتابعة انتظام العمل والخدمات وسياسات مكافحة العدوى وسلامة المرضى.",
    url: "https://www.youm7.com/story/2026/7/2/%D8%B2%D9%8A%D8%A7%D8%B1%D8%A9-%D9%85%D9%81%D8%A7%D8%AC%D8%A6%D8%A9-%D9%84%D9%85%D8%AF%D9%8A%D8%B1%D9%8A%D8%A9-%D8%A7%D9%84%D8%B5%D8%AD%D8%A9-%D8%A8%D8%B3%D9%88%D9%87%D8%A7%D8%AC-%D9%84%D9%85%D8%B3%D8%AA%D8%B4%D9%81%D9%89-%D8%A7%D9%84%D8%B9%D8%B3%D9%8A%D8%B1%D8%A7%D8%AA-%D9%88%D8%A7%D9%84%D9%85%D9%86%D8%B4%D8%A7%D8%A9-%D9%84%D9%85%D8%AA%D8%A7%D8%A8%D8%B9%D8%A9-%D8%A7%D9%84%D8%B9%D9%85%D9%84/7468253",
    source: "اليوم السابع",
    sourceUrl: "https://www.youm7.com/rss/rss",
    publishedAt: "2026-07-02T07:16:00.000Z",
    village: "مركز العسيرات",
    topic: "الصحة",
    origin: "archive",
  },
  {
    id: "archive-youm7-7463817",
    title:
      "رئيس منطقة سوهاج الأزهرية يتفقد لجان العسيرات ويطمئن على سير امتحان الجغرافيا",
    summary:
      "متابعة ميدانية للجان الامتحانات بمركز العسيرات والاطمئنان على انتظامها.",
    url: "https://www.youm7.com/story/2026/6/28/%D8%B1%D8%A6%D9%8A%D8%B3-%D9%85%D9%86%D8%B7%D9%82%D8%A9-%D8%B3%D9%88%D9%87%D8%A7%D8%AC-%D8%A7%D9%84%D8%A3%D8%B2%D9%87%D8%B1%D9%8A%D8%A9-%D9%8A%D8%AA%D9%81%D9%82%D8%AF-%D9%84%D8%AC%D8%A7%D9%86-%D8%A7%D9%84%D8%B9%D8%B3%D9%8A%D8%B1%D8%A7%D8%AA-%D9%88%D9%8A%D8%B7%D9%85%D8%A6%D9%86-%D8%B9%D9%84%D9%89-%D8%B3%D9%8A%D8%B1/7463817",
    source: "اليوم السابع",
    sourceUrl: "https://www.youm7.com/rss/rss",
    publishedAt: "2026-06-28T10:10:00.000Z",
    village: "مركز العسيرات",
    topic: "التعليم",
    origin: "archive",
  },
  {
    id: "archive-youm7-7320784",
    title: "صحة سوهاج تواصل حملتها على مركز العسيرات وضبط منشأة غير مرخصة",
    summary:
      "حملة تفتيش على منشآت صحية خاصة للتأكد من الترخيص والالتزام بالاشتراطات.",
    url: "https://www.youm7.com/story/2026/2/27/%D8%B5%D8%AD%D8%A9-%D8%B3%D9%88%D9%87%D8%A7%D8%AC-%D8%AA%D9%88%D8%A7%D8%B5%D9%84-%D8%AD%D9%85%D9%84%D8%AA%D9%87%D8%A7-%D8%B9%D9%84%D9%89-%D9%85%D8%B1%D9%83%D8%B2-%D8%A7%D9%84%D8%B9%D8%B3%D9%8A%D8%B1%D8%A7%D8%AA-%D9%88%D8%B6%D8%A8%D8%B7-%D9%85%D9%86%D8%B4%D8%A3%D8%A9-%D8%BA%D9%8A%D8%B1/7320784",
    source: "اليوم السابع",
    sourceUrl: "https://www.youm7.com/rss/rss",
    publishedAt: "2026-02-27T10:37:00.000Z",
    village: "مركز العسيرات",
    topic: "الصحة",
    origin: "archive",
  },
  {
    id: "archive-almasryalyoum-4203727",
    title:
      "تطورات الحالة الصحية لمصابي التسمم بالبوظة في سوهاج وإجراءات قانونية بحق البائع",
    summary:
      "متابعة الحالة الصحية لعشرات المصابين من أهالي العسيرات والإجراءات الرقابية والقانونية المرتبطة بالواقعة.",
    url: "https://www.almasryalyoum.com/news/details/4203727",
    source: "المصري اليوم",
    sourceUrl: "https://www.almasryalyoum.com/rss",
    publishedAt: "2026-02-20T12:02:00.000Z",
    village: "مركز العسيرات",
    topic: "الصحة",
    origin: "archive",
  },
];

const topicRules: Array<{ topic: NewsTopic; terms: string[] }> = [
  {
    topic: "الصحة",
    terms: [
      "صحه",
      "مستشفي",
      "طبي",
      "علاج",
      "مرض",
      "قافله طبيه",
      "صيدليه",
      "تسمم",
    ],
  },
  {
    topic: "التعليم",
    terms: ["تعليم", "مدرسه", "ازهر", "امتحان", "طلاب", "جامعه", "معهد"],
  },
  {
    topic: "خدمات وتنمية",
    terms: [
      "محافظ",
      "رصف",
      "طريق",
      "مياه",
      "صرف",
      "كهرباء",
      "مشروع",
      "تطوير",
      "تموين",
      "زراعه",
    ],
  },
  {
    topic: "المجتمع",
    terms: ["انتخابات", "مبادره", "اهالي", "شباب", "جمعيه", "احتفال", "ثقافه"],
  },
];

const directAreaTerms = ["العسيرات", "عسيرات"];
const contextTerms = ["العسيرات", "سوهاج"];
const primaryVillages = [
  "أولاد حمزة",
  "جزيرة أولاد حمزة",
  "الرشايدة",
  "الأحايوة غرب",
  "النويرات",
  "عوامر العسيرات",
  "الشهداء",
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
  const withoutCdata = value
    .replace(/^\s*<!\[CDATA\[/, "")
    .replace(/\]\]>\s*$/, "");
  const withoutMarkup = withoutCdata
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(withoutMarkup)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const shortened = value
    .slice(0, maxLength + 1)
    .replace(/\s+\S*$/, "")
    .trim();
  return `${shortened || value.slice(0, maxLength).trim()}…`;
}

function readXmlTag(block: string, tag: string) {
  const match = block.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );
  return cleanText(match?.[1] || "");
}

function safeExternalUrl(
  value: string,
  allowedHosts: string[],
  baseUrl?: string,
) {
  try {
    const url = new URL(decodeEntities(value), baseUrl);
    if (
      url.protocol !== "https:" ||
      !allowedHosts.includes(url.hostname.toLowerCase())
    )
      return "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function parsePublishedAt(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function parseDateFromYoum7Url(url: string) {
  const match = url.match(/\/story\/(\d{4})\/(\d{1,2})\/(\d{1,2})\//);
  if (!match) return "";
  const [, year, month, day] = match;
  const parsed = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 12),
  );
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function parseRss(xml: string, source: FeedSource): RawNewsItem[] {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return blocks.flatMap((block) => {
    const title = truncate(readXmlTag(block, "title"), 220);
    const url = safeExternalUrl(readXmlTag(block, "link"), source.allowedHosts);
    const publishedAt = parsePublishedAt(
      readXmlTag(block, "pubDate") || readXmlTag(block, "date"),
    );
    const summary = truncate(readXmlTag(block, "description"), 260);
    if (!title || !url || !publishedAt) return [];
    return [{ title, url, publishedAt, ...(summary ? { summary } : {}) }];
  });
}

function sliceHtmlBlocks(html: string, marker: RegExp) {
  const matches = [...html.matchAll(marker)];
  return matches.map((match, index) =>
    html.slice(match.index ?? 0, matches[index + 1]?.index ?? html.length),
  );
}

function readHtmlAttribute(tag: string, attribute: string) {
  const match = tag.match(
    new RegExp(
      `\\s${attribute}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`,
      "i",
    ),
  );
  return decodeEntities(match?.[1] || match?.[2] || match?.[3] || "");
}

function parseYoum7Cards(html: string, source: FeedSource): RawNewsItem[] {
  const blocks = sliceHtmlBlocks(
    html,
    /<div\b[^>]*class=["'][^"']*\bbigOneSec\b[^"']*["'][^>]*>/gi,
  );
  return blocks.flatMap((block) => {
    const heading = block.match(/<h3\b[^>]*>[\s\S]*?<\/h3>/i)?.[0] || "";
    const anchor = heading.match(/<a\b[^>]*>[\s\S]*?<\/a>/i)?.[0] || "";
    const url = safeExternalUrl(
      readHtmlAttribute(anchor, "href"),
      source.allowedHosts,
      source.url,
    );
    const title = truncate(cleanText(anchor), 220);
    const publishedAt = parseDateFromYoum7Url(url);
    const summary = truncate(
      cleanText(block.match(/<p\b[^>]*>[\s\S]*?<\/p>/i)?.[0] || ""),
      360,
    );
    if (!title || !url || !publishedAt) return [];
    return [{ title, url, publishedAt, ...(summary ? { summary } : {}) }];
  });
}

function parseYoum7TagPage(html: string, source: FeedSource): RawNewsItem[] {
  const cards = parseYoum7Cards(html, source);
  if (cards.length) return cards;
  const scripts =
    html.match(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
    ) || [];
  const script = scripts.find(
    (candidate) =>
      candidate.includes("CollectionPage") &&
      candidate.includes("itemListElement"),
  );
  if (!script) return [];
  const payload = script
    .replace(/^<script\b[^>]*>/i, "")
    .replace(/<\/script>$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(payload) as {
      mainEntity?: {
        itemListElement?: Array<{ url?: unknown; name?: unknown }>;
      };
    };
    const entries = parsed.mainEntity?.itemListElement;
    if (!Array.isArray(entries)) return [];
    return entries.flatMap((entry) => {
      const title = truncate(
        cleanText(typeof entry.name === "string" ? entry.name : ""),
        220,
      );
      const url = safeExternalUrl(
        typeof entry.url === "string" ? entry.url : "",
        source.allowedHosts,
      );
      const publishedAt = parseDateFromYoum7Url(url);
      return title && url && publishedAt ? [{ title, url, publishedAt }] : [];
    });
  } catch {
    return [];
  }
}

function lastYoum7Cursor(html: string) {
  const matches = [
    ...html.matchAll(
      /<div\b[^>]*class=["'][^"']*\bbigOneSec\b[^"']*["'][^>]*>/gi,
    ),
  ];
  return readHtmlAttribute(matches.at(-1)?.[0] || "", "data-id");
}

const arabicMonths = new Map([
  ["يناير", 0],
  ["فبراير", 1],
  ["مارس", 2],
  ["ابريل", 3],
  ["مايو", 4],
  ["يونيو", 5],
  ["يوليو", 6],
  ["اغسطس", 7],
  ["سبتمبر", 8],
  ["اكتوبر", 9],
  ["نوفمبر", 10],
  ["ديسمبر", 11],
]);

function parseArabicPublishedAt(value: string) {
  const normalized = normalizeArabic(cleanText(value)).replace(/،/g, " ");
  const match = normalized.match(
    /(\d{1,2})\s+(يناير|فبراير|مارس|ابريل|مايو|يونيو|يوليو|اغسطس|سبتمبر|اكتوبر|نوفمبر|ديسمبر)\s+(\d{4})/,
  );
  if (!match) return "";
  const [, day, monthName, year] = match;
  const month = arabicMonths.get(monthName);
  if (month === undefined) return "";
  const parsed = new Date(Date.UTC(Number(year), month, Number(day), 12));
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function parseAzharZonePage(html: string, source: FeedSource): RawNewsItem[] {
  const blocks = sliceHtmlBlocks(
    html,
    /<div\b[^>]*class=["'][^"']*\barticle\b[^"']*\bitem\b[^"']*["'][^>]*>/gi,
  );
  return blocks.flatMap((block) => {
    const heading =
      block.match(
        /<h2\b[^>]*class=["'][^"']*\barticle_title\b[^"']*["'][^>]*>[\s\S]*?<\/h2>/i,
      )?.[0] || "";
    const anchor = heading.match(/<a\b[^>]*>[\s\S]*?<\/a>/i)?.[0] || "";
    const url = safeExternalUrl(
      readHtmlAttribute(anchor, "href"),
      source.allowedHosts,
      source.url,
    );
    const title = truncate(cleanText(anchor), 220);
    const meta =
      block.match(
        /<span\b[^>]*class=["'][^"']*\barticle_meta\b[^"']*["'][^>]*>[\s\S]*?<\/span>/i,
      )?.[0] || "";
    const publishedAt = parseArabicPublishedAt(meta);
    const excerpt =
      block.match(
        /<h3\b[^>]*class=["'][^"']*\barticle_excerpt\b[^"']*["'][^>]*>[\s\S]*?<\/h3>/i,
      )?.[0] || "";
    const summary = truncate(cleanText(excerpt), 360);
    if (!title || !url || !publishedAt) return [];
    return [{ title, url, publishedAt, ...(summary ? { summary } : {}) }];
  });
}

function parsePageDescription(html: string) {
  const metaTags = html.slice(0, 1_500_000).match(/<meta\b[^>]*>/gi) || [];
  for (const key of ["og:description", "twitter:description", "description"]) {
    const tag = metaTags.find((candidate) => {
      const label =
        readHtmlAttribute(candidate, "property") ||
        readHtmlAttribute(candidate, "name");
      return label.toLowerCase() === key;
    });
    const value = cleanText(tag ? readHtmlAttribute(tag, "content") : "");
    if (value.length >= 40) return truncate(value, 900);
  }
  return "";
}

function parseJsonLdPayloads(html: string) {
  const scripts =
    html
      .slice(0, 4_000_000)
      .match(
        /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
      ) || [];
  return scripts.flatMap((script): unknown[] => {
    const payload = script
      .replace(/^<script\b[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();
    if (!payload) return [];
    try {
      return [JSON.parse(payload) as unknown];
    } catch {
      return [];
    }
  });
}

function collectArticleBodies(value: unknown, results: string[]) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectArticleBodies(entry, results));
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (typeof record.articleBody === "string") {
    const body = cleanText(record.articleBody);
    if (body.length >= 300) results.push(body);
  }
  Object.values(record).forEach((entry) =>
    collectArticleBodies(entry, results),
  );
}

function isUsefulArticleParagraph(value: string) {
  if (value.length < 55) return false;
  const arabicCharacters = value.match(/[\u0600-\u06ff]/g)?.length || 0;
  if (arabicCharacters < 25) return false;
  const normalized = normalizeArabic(value);
  return ![
    "اقرا ايضا",
    "اقرا المزيد",
    "تابعونا",
    "اشترك",
    "اضغط هنا",
    "سياسه الخصوصيه",
    "جميع الحقوق محفوظه",
    "شارك الخبر",
    "التعليقات",
    "اخبار متعلقه",
  ].some((term) => normalized.includes(term));
}

function parseArticleParagraphFallback(html: string) {
  const markers = [
    /<(?:article|div|section)\b[^>]*(?:class|id)=["'][^"']*(?:article[-_ ]?(?:body|content|text|details)|story[-_ ]?content|entry[-_ ]?content|news[-_ ]?(?:body|content|details)|articlecont|bodycontent)[^"']*["'][^>]*>/i,
    /<article\b[^>]*>/i,
  ];
  const marker = markers.map((pattern) => pattern.exec(html)).find(Boolean);
  if (!marker || marker.index < 0) return "";
  const region = html.slice(marker.index, marker.index + 350_000);
  const paragraphs = region.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
  const unique = new Set<string>();
  let totalLength = 0;
  for (const paragraph of paragraphs) {
    const text = cleanText(paragraph);
    if (!isUsefulArticleParagraph(text)) continue;
    unique.add(text);
    totalLength += text.length;
    if (totalLength >= MAX_SOURCE_TEXT_LENGTH) break;
  }
  return [...unique].join("\n\n");
}

function parseArticleText(html: string) {
  const articleBodies: string[] = [];
  parseJsonLdPayloads(html).forEach((payload) =>
    collectArticleBodies(payload, articleBodies),
  );
  const jsonLdBody =
    [...articleBodies].sort((a, b) => b.length - a.length)[0] || "";
  const body = jsonLdBody || parseArticleParagraphFallback(html);
  return body ? truncate(body, MAX_SOURCE_TEXT_LENGTH) : "";
}

export function buildSourceNewsDigest(
  item: Pick<LocalNewsItem, "title" | "summary"> & {
    sourceExcerpt?: string;
    sourceText?: string;
  },
  preparedAt = new Date().toISOString(),
): SourceNewsDigest {
  const lead = truncate(
    cleanText(item.sourceExcerpt || item.summary || item.title),
    420,
  );
  const leadFingerprint = normalizeArabic(lead);
  const excerpts: string[] = [];
  const fingerprints = new Set<string>();
  let totalLength = 0;
  for (const candidate of (item.sourceText || "").split(
    /\n{2,}|(?<=[.!؟])\s+/u,
  )) {
    const sentence = cleanText(candidate);
    if (!isUsefulArticleParagraph(sentence)) continue;
    const excerpt = truncate(sentence, 220);
    const fingerprint = normalizeArabic(excerpt);
    if (!fingerprint || fingerprints.has(fingerprint)) continue;
    if (leadFingerprint.includes(fingerprint.slice(0, 90))) continue;
    if (totalLength + excerpt.length > 620) break;
    excerpts.push(excerpt);
    fingerprints.add(fingerprint);
    totalLength += excerpt.length;
    if (excerpts.length >= 3) break;
  }
  return { kind: "source-digest", lead, excerpts, preparedAt };
}

function isRelevant(raw: RawNewsItem, source: FeedSource) {
  if (source.format === "youm7-tag") return true;
  const normalized = normalizeArabic(`${raw.title} ${raw.summary || ""}`);
  if (
    directAreaTerms.some((term) => normalized.includes(normalizeArabic(term)))
  )
    return true;
  const hasLocalContext = contextTerms.some((term) =>
    normalized.includes(normalizeArabic(term)),
  );
  return (
    hasLocalContext &&
    primaryVillages.some((village) =>
      normalized.includes(normalizeArabic(village)),
    )
  );
}

function detectVillage(value: string) {
  const normalized = normalizeArabic(value);
  const village = [...primaryVillages]
    .sort((a, b) => b.length - a.length)
    .find((candidate) => {
      const name = normalizeArabic(candidate);
      if (!normalized.includes(name)) return false;
      return candidate !== "الشهداء" || normalized.includes(`قريه ${name}`);
    });
  return village || "مركز العسيرات";
}

function detectTopic(value: string): NewsTopic {
  const normalized = normalizeArabic(value);
  return (
    topicRules.find((rule) =>
      rule.terms.some((term) => normalized.includes(term)),
    )?.topic || "أخبار وحوادث"
  );
}

function stableId(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1)
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  return (hash >>> 0).toString(36);
}

function toLocalNewsItem(raw: RawNewsItem, source: FeedSource): LocalNewsItem {
  const text = `${raw.title} ${raw.summary || ""}`;
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
    origin: "live",
  };
}

async function fetchSourceBody(source: FeedSource, url: string) {
  const response = await fetch(url, {
    headers: {
      accept:
        source.format === "rss"
          ? "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5"
          : "text/html, application/xhtml+xml;q=0.9, */*;q=0.5",
      "user-agent":
        "UsayratDirectoryNewsMonitor/1.0 (+https://usayrat.online/news)",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok)
    throw new Error(`News source ${source.id} returned ${response.status}`);
  return response.text();
}

async function fetchYoum7TagItems(source: FeedSource, firstPage: string) {
  const pages = [firstPage];
  let cursor = lastYoum7Cursor(firstPage);
  const tagId = new URL(source.url).searchParams.get("id") || "";
  for (
    let page = 0;
    page < (source.additionalPages || 0) && cursor && tagId;
    page += 1
  ) {
    const pagedUrl = new URL("/Tags/TagsPaged", source.url);
    pagedUrl.searchParams.set("tag", tagId);
    pagedUrl.searchParams.set("id", cursor);
    try {
      const body = await fetchSourceBody(source, pagedUrl.toString());
      if (!body.trim()) break;
      pages.push(body);
      const nextCursor = lastYoum7Cursor(body);
      if (!nextCursor || nextCursor === cursor) break;
      cursor = nextCursor;
    } catch {
      break;
    }
  }
  return pages.flatMap((page) => parseYoum7TagPage(page, source));
}

async function fetchSource(source: FeedSource) {
  const body = await fetchSourceBody(source, source.url);
  const rawItems =
    source.format === "rss"
      ? parseRss(body, source)
      : source.format === "youm7-tag"
        ? await fetchYoum7TagItems(source, body)
        : parseAzharZonePage(body, source);
  const cutoff = Date.now() - MAX_ITEM_AGE_MS;
  return rawItems
    .filter((item) => new Date(item.publishedAt).getTime() >= cutoff)
    .filter((item) => isRelevant(item, source))
    .map((item) => toLocalNewsItem(item, source));
}

function normalizedHeadline(item: LocalNewsItem) {
  return normalizeArabic(item.title)
    .replace(/\b(صور|فيديو|تفاصيل|اعرف)\b/g, " ")
    .replace(/\s+/g, " ")
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

export async function collectLocalNewsFromSources(
  limit = 80,
): Promise<LocalNewsFeed> {
  const settled = await Promise.allSettled(
    newsSources.map((source) => fetchSource(source)),
  );
  const liveItems = settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  const merged = deduplicate([...liveItems, ...archivedNews])
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, limit);
  return {
    items: merged,
    liveItemCount: liveItems.length,
    connectedSourceCount: settled.filter(
      (result) => result.status === "fulfilled",
    ).length,
    totalSourceCount: newsSources.length,
  };
}

function sourceForItem(item: LocalNewsItem) {
  try {
    const hostname = new URL(item.url).hostname.toLowerCase();
    return newsSources.find((source) => source.allowedHosts.includes(hostname));
  } catch {
    return undefined;
  }
}

export async function fetchSourceDetail(item: LocalNewsItem) {
  const source = sourceForItem(item);
  if (!source || !safeExternalUrl(item.url, source.allowedHosts))
    return { sourceExcerpt: item.summary || "" };
  try {
    const response = await fetch(item.url, {
      headers: {
        accept: "text/html, application/xhtml+xml;q=0.9, */*;q=0.5",
        "user-agent":
          "UsayratDirectoryNewsMonitor/1.0 (+https://usayrat.online/news)",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return { sourceExcerpt: item.summary || "" };
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("text/html"))
      return { sourceExcerpt: item.summary || "" };
    const html = await response.text();
    const sourceExcerpt = parsePageDescription(html) || item.summary || "";
    const sourceText = parseArticleText(html);
    return {
      ...(sourceExcerpt ? { sourceExcerpt } : {}),
      ...(sourceText ? { sourceText } : {}),
    };
  } catch {
    return { sourceExcerpt: item.summary || "" };
  }
}
