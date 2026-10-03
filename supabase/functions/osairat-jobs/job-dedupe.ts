type JobIdentity = { source_url: string | null; title: string; organization: string | null; village: string; published_at: string; description?: string };

const normalize = (value: string) => value.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/[\u064b-\u065f\u0670]/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();

function urlKey(value: string) {
  try {
    const url = new URL(value);
    // Forasna keeps the ID when it changes the employer/title slug. A renamed
    // URL must not duplicate a live job or revive a moderated one.
    const forasnaId = url.hostname === 'forasna.com' && /^\/job\/p\/.*-(\d+)\/?$/.exec(url.pathname)?.[1];
    if (forasnaId) return `https://forasna.com/job/p/${forasnaId}`;
    for (const key of [...url.searchParams.keys()]) if (/^(?:utm_|fbclid$|gclid$|ref$)/i.test(key)) url.searchParams.delete(key);
    return url.href.replace(/\/$/, '');
  } catch { return value; }
}

function contentKey(job: JobIdentity) {
  const company = normalize(job.organization || "");
  // Anonymous employers and channel names are not a company identity. Two
  // different shops advertising a cashier must remain separate opportunities.
  if (company.length < 3 || /جه[هة]|غير (?:مفصح|معلن)|كبرى|شهيره|confidential|المصدر|تيليجرام|فيسبوك|وظائف|Google|Bing/i.test(company)) return null;
  const title = normalize(job.title).replace(/^(?:مطلوب|وظائف (?:سوهاج|العسيرات))\s+/, '');
  const locality = normalize(job.village).replace(/^(?:مدينه|محافظه)\s+/, '');
  const date = job.published_at.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return `${company}|${title}|${locality}|${date}`;
}

export function dedupeJobs<T extends JobIdentity>(incoming: T[], existing: JobIdentity[] = []) {
  const urls = new Set(existing.map((job) => urlKey(job.source_url || "")));
  const identities = new Set(existing.map(contentKey).filter((key): key is string => key !== null));
  return incoming.filter((job) => {
    const url = urlKey(job.source_url || "");
    const identity = contentKey(job);
    if (urls.has(url) || identity && identities.has(identity)) return false;
    urls.add(url);
    if (identity) identities.add(identity);
    return true;
  });
}
