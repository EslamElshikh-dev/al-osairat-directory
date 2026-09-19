export type BlogSourceKind = 'official' | 'academic' | 'press' | 'maps' | 'local';

const pressHosts = new Set([
  'gate.ahram.org.eg',
  'www.masrawy.com',
  'www.alwafd.news',
  'www.youm7.com',
  'www.elwatannews.com',
  'www.almasryalyoum.com',
  'www.rosaelyoussef.com',
  'www.dostor.org',
  'www.vetogate.com',
  'www.elbalad.news',
  'm.akhbarelyom.com',
]);

export function classifyBlogSource(url: string): BlogSourceKind {
  try {
    const host = new URL(url).hostname.toLowerCase();

    if (
      host.endsWith('.gov.eg')
      || host === 'azhar.eg'
      || host.endsWith('.azhar.eg')
      || host === 'mped.gov.eg'
    ) return 'official';

    if (host === 'journals.ekb.eg' || host.endsWith('.ekb.eg')) return 'academic';

    if (
      host === 'www.google.com'
      || host === 'google.com'
      || host === 'maps.google.com'
      || host === 'maps.app.goo.gl'
    ) return 'maps';

    if (pressHosts.has(host)) return 'press';

    return 'local';
  } catch {
    return 'local';
  }
}

export const blogSourceKindLabels: Record<BlogSourceKind, string> = {
  official: 'رسمي',
  academic: 'أكاديمي',
  press: 'صحفي',
  maps: 'خرائط',
  local: 'محلي/مرجعي',
};

export function summarizeBlogSources(urls: string[]) {
  const unique = [...new Set(urls.filter(Boolean))];
  const counts: Record<BlogSourceKind, number> = {
    official: 0,
    academic: 0,
    press: 0,
    maps: 0,
    local: 0,
  };

  for (const url of unique) counts[classifyBlogSource(url)] += 1;

  return { total: unique.length, counts };
}
