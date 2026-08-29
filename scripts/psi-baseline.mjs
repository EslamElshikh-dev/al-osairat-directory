const target = 'https://al-osairat-directory.vercel.app/';
const domain = 'al-osairat-directory.vercel.app';

async function runOfficial() {
  const params = new URLSearchParams({ url: target, strategy: 'mobile', locale: 'en' });
  for (const category of ['performance', 'accessibility', 'best-practices', 'seo']) {
    params.append('category', category);
  }

  const response = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) {
    throw Object.assign(new Error(data?.error?.message || `PageSpeed HTTP ${response.status}`), { status: response.status });
  }

  const lighthouse = data?.lighthouseResult || {};
  const audits = lighthouse.audits || {};
  const categories = lighthouse.categories || {};

  return {
    source: 'google-pagespeed-api',
    target,
    measuredAt: new Date().toISOString(),
    lighthouseVersion: lighthouse.lighthouseVersion,
    scores: {
      performance: Math.round((categories.performance?.score || 0) * 100),
      accessibility: Math.round((categories.accessibility?.score || 0) * 100),
      bestPractices: Math.round((categories['best-practices']?.score || 0) * 100),
      seo: Math.round((categories.seo?.score || 0) * 100),
    },
    metrics: {
      fcpMs: Math.round(audits['first-contentful-paint']?.numericValue || 0),
      lcpMs: Math.round(audits['largest-contentful-paint']?.numericValue || 0),
      tbtMs: Math.round(audits['total-blocking-time']?.numericValue || 0),
      cls: audits['cumulative-layout-shift']?.numericValue ?? null,
      speedIndexMs: Math.round(audits['speed-index']?.numericValue || 0),
    },
  };
}

async function runFallback() {
  const response = await fetch(`https://page-speed.dev/api/run/${domain}`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.statusMessage || `Fallback HTTP ${response.status}`);

  return {
    source: 'page-speed.dev (Google PageSpeed API proxy)',
    target,
    measuredAt: new Date(data.timestamp).toISOString(),
    scores: {
      performance: data.performance,
      accessibility: data.accessibility,
      bestPractices: data.bestPractices,
      seo: data.seo,
    },
  };
}

try {
  const baseline = await runOfficial();
  console.log('[PSI_BASELINE]', JSON.stringify(baseline));
} catch (officialError) {
  console.log('[PSI_OFFICIAL_UNAVAILABLE]', JSON.stringify({
    status: officialError?.status || null,
    message: officialError instanceof Error ? officialError.message : String(officialError),
  }));

  try {
    const fallback = await runFallback();
    console.log('[PSI_BASELINE_FALLBACK]', JSON.stringify(fallback));
  } catch (fallbackError) {
    console.log('[PSI_BASELINE_ERROR]', JSON.stringify({
      message: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
    }));
  }
}
