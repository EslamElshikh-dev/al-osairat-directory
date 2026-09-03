import type { FacebookNewsRow, FacebookSource } from "./database.ts";

type FacebookPost = {
  id?: unknown;
  message?: unknown;
  created_time?: unknown;
  permalink_url?: unknown;
};

type FacebookPostsResponse = {
  data?: FacebookPost[];
  error?: { message?: string; code?: number; type?: string };
};

type FacebookPageLookupResponse = {
  id?: unknown;
  name?: unknown;
  error?: { message?: string; code?: number; type?: string };
};

const GRAPH_API_VERSION = "v26.0";
const GRAPH_TIMEOUT_MS = 12_000;
const MAX_MESSAGE_LENGTH = 12_000;
const MAX_SUMMARY_LENGTH = 240;
const MAX_TITLE_LENGTH = 150;

const VILLAGES = [
  "جزيرة أولاد حمزة",
  "أولاد حمزة",
  "الرشايدة",
  "الأحايوة غرب",
  "النويرات",
  "عوامر العسيرات",
  "الشهداء",
  "أولاد جبارة",
  "المساعيد",
  "أولاد بهيج",
] as const;

const LOCAL_TERMS = ["العسيرات", "عسيرات", ...VILLAGES].map(normalizeArabic);
const SENSITIVE_TERMS = [
  "وفاه", "توفي", "مصرع", "قتل", "مقتول", "جنازه", "حادث", "مصاب", "اصابه",
  "قبض", "متهم", "جريمه", "مخدر", "سلاح", "حريق", "غرق", "انتحار", "اعتداء",
].map(normalizeArabic);

function normalizeArabic(value: string) {
  return value
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(value: string) {
  return value.replace(/https?:\/\/\S+/gi, " ").replace(/\s+/g, " ").trim();
}

function safeFacebookUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || (host !== "facebook.com" && !host.endsWith(".facebook.com"))) return "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function stableId(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function detectVillage(value: string) {
  const normalized = normalizeArabic(value);
  return VILLAGES.find((name) => normalized.includes(normalizeArabic(name))) || "مركز العسيرات";
}

function detectTopic(value: string) {
  const text = normalizeArabic(value);
  if (["صحه", "مستشفي", "طبي", "علاج", "دواء", "صيدليه", "تطعيم"].some((term) => text.includes(term))) return "الصحة";
  if (["تعليم", "مدرسه", "ازهر", "امتحان", "طلاب", "جامعه", "معهد"].some((term) => text.includes(term))) return "التعليم";
  if (["محافظ", "رصف", "طريق", "مياه", "صرف", "كهرباء", "مشروع", "تطوير", "تموين", "وحده محليه"].some((term) => text.includes(normalizeArabic(term)))) return "خدمات وتنمية";
  if (["اهالي", "شباب", "جمعيه", "احتفال", "مبادره", "رياضه", "مسابقه"].some((term) => text.includes(term))) return "المجتمع";
  return "أخبار وحوادث";
}

function isLocal(value: string) {
  const text = normalizeArabic(value);
  return LOCAL_TERMS.some((term) => text.includes(term));
}

function isSensitive(value: string) {
  const text = normalizeArabic(value);
  return SENSITIVE_TERMS.some((term) => text.includes(term));
}

function makeTitle(message: string, sourceName: string) {
  const clean = compactText(message);
  if (!clean) return "";
  const sentence = clean.split(/(?<=[.!؟])\s+/u)[0] || clean;
  const title = sentence.length <= MAX_TITLE_LENGTH
    ? sentence
    : `${sentence.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`;
  return title || `تحديث جديد من ${sourceName}`;
}

function makeSummary(message: string, title: string) {
  const clean = compactText(message);
  if (!clean || clean === title) return null;
  const summary = clean.length <= MAX_SUMMARY_LENGTH
    ? clean
    : `${clean.slice(0, MAX_SUMMARY_LENGTH - 1).trimEnd()}…`;
  return summary === title ? null : summary;
}

async function graphJson<T>(endpoint: URL, token: string): Promise<T> {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => ({})) as T & {
    error?: { message?: string; code?: number; type?: string };
  };
  if (!response.ok || payload.error) {
    const code = payload.error?.code ? ` #${payload.error.code}` : "";
    const message = payload.error?.message?.replace(/\s+/g, " ").slice(0, 220)
      || `HTTP ${response.status}`;
    throw new Error(`Meta Graph API${code}: ${message}`);
  }
  return payload;
}

export async function resolveFacebookPageId(source: FacebookSource, token: string) {
  const existing = source.graphPageId?.trim() || "";
  if (/^\d{3,30}$/.test(existing)) return existing;

  const ref = source.externalId.trim();
  if (/^\d{3,30}$/.test(ref)) return ref;

  const endpoint = new URL(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(ref)}`,
  );
  endpoint.searchParams.set("fields", "id,name");
  const payload = await graphJson<FacebookPageLookupResponse>(endpoint, token);
  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  if (!/^\d{3,30}$/.test(id)) throw new Error(`Meta Graph API returned no numeric Page ID for ${source.id}`);
  return id;
}

export async function fetchFacebookPagePosts(source: FacebookSource, token: string) {
  const pageId = source.graphPageId?.trim() || source.externalId.trim();
  if (!/^\d{3,30}$/.test(pageId)) throw new Error(`Facebook source ${source.id} has no resolved numeric Page ID`);

  const endpoint = new URL(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(pageId)}/posts`,
  );
  endpoint.searchParams.set("fields", "id,message,created_time,permalink_url");
  endpoint.searchParams.set("limit", "12");

  const payload = await graphJson<FacebookPostsResponse>(endpoint, token);
  return Array.isArray(payload.data) ? payload.data : [];
}

export function mapFacebookPostToNews(
  source: FacebookSource,
  raw: FacebookPost,
): FacebookNewsRow | undefined {
  const postId = typeof raw.id === "string" ? raw.id.trim() : "";
  const message = typeof raw.message === "string"
    ? raw.message.trim().slice(0, MAX_MESSAGE_LENGTH)
    : "";
  const createdTime = typeof raw.created_time === "string" ? raw.created_time.trim() : "";
  const permalink = typeof raw.permalink_url === "string"
    ? safeFacebookUrl(raw.permalink_url.trim())
    : "";
  const publishedAt = Date.parse(createdTime);

  if (!postId || !message || !permalink || !Number.isFinite(publishedAt)) return undefined;
  if (source.requireLocalMatch && !isLocal(message)) return undefined;

  const title = makeTitle(message, source.name);
  if (!title) return undefined;
  const summary = makeSummary(message, title);
  const sensitive = isSensitive(message);
  const trustedForAutomatic = source.trustLevel !== "review"
    && source.publishMode === "automatic";
  const canAutoPublish = trustedForAutomatic
    && (!sensitive || source.allowSensitiveAutoPublish);
  const now = new Date().toISOString();
  const detectedVillage = detectVillage(message);
  const village = detectedVillage === "مركز العسيرات" && source.defaultVillage
    ? source.defaultVillage
    : detectedVillage;

  return {
    id: `facebook-${stableId(postId)}`,
    title,
    summary,
    url: permalink,
    source: source.name,
    source_url: source.sourceUrl,
    published_at: new Date(publishedAt).toISOString(),
    village,
    topic: detectTopic(message),
    origin: "live",
    status: canAutoPublish ? "published" : "hidden",
    editorial_status: "source-only",
    source_excerpt: summary || title,
    source_kind: "facebook",
    source_external_id: postId,
    source_parent_external_id: source.graphPageId || source.externalId,
    source_trust_level: source.trustLevel,
    last_seen_at: now,
    updated_at: now,
  };
}
