import { placeFor } from './places.ts';

type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};

export function cleanJobText(value: unknown, limit = 750) {
  if (typeof value !== 'string') return '';
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]*>/g, ' ')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, raw: string) => {
      const code = raw.toLowerCase().startsWith('x') ? parseInt(raw.slice(1), 16) : parseInt(raw, 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }).replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, (entity) => ({
      '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ',
    })[entity] || entity).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function jobSchemas(html: string, type: string) {
  const nodes: JsonObject[] = [];
  let visited = 0;
  const visit = (value: unknown, depth = 0) => {
    if (depth > 3 || visited++ > 80) return;
    if (Array.isArray(value)) { value.forEach((item) => visit(item, depth + 1)); return; }
    const node = object(value);
    if (node['@type'] === type || Array.isArray(node['@type']) && node['@type'].includes(type)) nodes.push(node);
    if (Array.isArray(node['@graph'])) visit(node['@graph'], depth + 1);
  };
  for (const script of [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].slice(0, 12)) {
    try { visit(JSON.parse(script[1])); } catch { /* Malformed metadata is never an announcement. */ }
  }
  return nodes;
}

function publicationDate(value: unknown) {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}(?:[T ][\d:.+-]+Z?)?$/.test(value)) return null;
  let iso = value.replace(' ', 'T');
  const day = iso.slice(0, 10);
  const calendar = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== day) return null;
  if (/T\d{2}:\d{2}(?::\d{2})?$/.test(iso)) iso += 'Z';
  const time = Date.parse(iso);
  return Number.isFinite(time) ? time : null;
}

function closingDate(value: unknown) {
  if (typeof value !== 'string' || !value) return null;
  if (/^20\d{2}-\d{2}-\d{2}/.test(value)) {
    const calendar = new Date(`${value.slice(0, 10)}T00:00:00Z`);
    if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== value.slice(0, 10)) return Number.NaN;
  }
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;
  // ApplicantPro appends a second time to some validThrough values. Retain
  // its actual calendar day, while still capping our listing's lifetime.
  const day = /^(20\d{2})-(\d{2})-(\d{2})[ T]/.exec(value);
  if (!day) return Number.NaN;
  const date = new Date(Date.UTC(+day[1], +day[2] - 1, +day[3], 23, 59, 59));
  return date.getUTCFullYear() === +day[1] && date.getUTCMonth() === +day[2] - 1 && date.getUTCDate() === +day[3] ? date.getTime() : Number.NaN;
}

export function readStructuredJob(html: string, url: string, source: { name: string; accepts: (url: string) => boolean; freshnessDays?: number }, now = Date.now()) {
  if (!source.accepts(url)) return null;
  const post = jobSchemas(html, 'JobPosting')[0];
  if (!post) return null;
  const posted = publicationDate(post.datePosted);
  const freshMs = (source.freshnessDays ?? 14) * 86_400_000;
  if (posted === null || now - posted < -4 * 3_600_000 || now - posted > freshMs) return null;
  const deadline = closingDate(post.validThrough);
  if (deadline !== null && (!Number.isFinite(deadline) || deadline <= now)) return null;
  const expires = Math.min(posted + freshMs, deadline ?? Number.POSITIVE_INFINITY);
  if (expires <= now) return null;
  const locations = Array.isArray(post.jobLocation) ? post.jobLocation : [post.jobLocation];
  // More than one governorate needs separate, identified openings. Never
  // assign a countrywide roundup to Usayrat based on a mention in its text.
  const addresses = locations.map((location) => object(object(location).address));
  const regions = addresses.map((address) => cleanJobText(`${address.addressRegion || ''} ${address.addressLocality || ''}`, 160));
  if (!regions.length || regions.some(region => !/(سوهاج|\bsohag\b)/i.test(region))) return null;
  if (addresses.some((address) => {
    const country = cleanJobText(typeof address.addressCountry === 'object' ? object(address.addressCountry).name : address.addressCountry, 80);
    return country && !/^(?:EG|Egypt|مصر)$/i.test(country);
  })) return null;
  const title = cleanJobText(post.title, 140);
  if (title.length < 3) return null;
  const details = cleanJobText(post.description, 3500);
  const locationText = regions.join(' ');
  const village = placeFor(locationText);
  if (!village) return null;
  const organization = cleanJobText(object(post.hiringOrganization).name, 120).replace(/^Confidential$/i, 'جهة التوظيف في المصدر') || 'جهة التوظيف في المصدر';
  const description = details.slice(0, 750).replace(/(?:\+?20|0020)?\s*01[0125](?:[\s-]?\d){8}/g, 'رقم التواصل في الإعلان الأصلي')
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, 'البريد في الإعلان الأصلي');
  const publishedAt = new Date(Math.min(posted, now)).toISOString();
  return { kind: 'offer', origin: 'external', status: 'approved', title, organization, village,
    field: 'وظائف محافظة سوهاج', description: description || `فرصة عمل لدى ${organization}. راجع الإعلان الأصلي للشروط وطريقة التقديم.`,
    contact_kind: 'link', contact_value: url, source_name: source.name, source_url: url,
    published_at: publishedAt, expires_at: new Date(expires).toISOString() };
}

export function structuredListingLinks(html: string, base: string, accepts: (url: string) => boolean, limit = 8) {
  const urls = jobSchemas(html, 'ItemList').flatMap((list) => Array.isArray(list.itemListElement) ? list.itemListElement : [])
    .flatMap((item) => {
      const value = typeof item === 'string' ? item : object(item).url || object(object(item).item).url;
      if (typeof value !== 'string') return [];
      try { const url = new URL(value, base).href; return accepts(url) ? [url] : []; } catch { return []; }
    });
  return [...new Set(urls)].slice(0, limit);
}
