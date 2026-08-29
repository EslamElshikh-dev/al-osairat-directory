const target = 'https://al-osairat-directory.vercel.app/';
const params = new URLSearchParams({ url: target, strategy: 'mobile', locale: 'en' });
for (const category of ['performance', 'accessibility', 'best-practices', 'seo']) {
  params.append('category', category);
}

try {
  const response = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    console.log('[PSI_BASELINE_ERROR]', JSON.stringify({ status: response.status, error: data?.error || data }));
    process.exit(0);
  }

  const lighthouse = data?.lighthouseResult || {};
  const audits = lighthouse.audits || {};
  const categories = lighthouse.categories || {};

  const baseline = {
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
    diagnostics: {
      totalByteWeight: Math.round(audits['total-byte-weight']?.numericValue || 0),
      unusedJsSavingsBytes: Math.round(audits['unused-javascript']?.details?.overallSavingsBytes || 0),
      unusedCssSavingsBytes: Math.round(audits['unused-css-rules']?.details?.overallSavingsBytes || 0),
    },
  };

  console.log('[PSI_BASELINE]', JSON.stringify(baseline));
} catch (error) {
  console.log('[PSI_BASELINE_ERROR]', JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
}
