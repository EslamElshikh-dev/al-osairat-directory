import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const target = 'https://al-osairat-directory.vercel.app/';
  const params = new URLSearchParams({ url: target, strategy: 'mobile', locale: 'en' });
  for (const category of ['performance', 'accessibility', 'best-practices', 'seo']) {
    params.append('category', category);
  }

  const response = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`, {
    cache: 'no-store',
  });

  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json({ ok: false, status: response.status, error: data }, { status: 502 });
  }

  const lighthouse = data?.lighthouseResult;
  const audits = lighthouse?.audits || {};
  const categories = lighthouse?.categories || {};

  return NextResponse.json({
    ok: true,
    fetchedAt: new Date().toISOString(),
    target,
    lighthouseVersion: lighthouse?.lighthouseVersion,
    scores: {
      performance: Math.round((categories?.performance?.score || 0) * 100),
      accessibility: Math.round((categories?.accessibility?.score || 0) * 100),
      bestPractices: Math.round((categories?.['best-practices']?.score || 0) * 100),
      seo: Math.round((categories?.seo?.score || 0) * 100),
    },
    metrics: {
      fcpMs: audits?.['first-contentful-paint']?.numericValue,
      lcpMs: audits?.['largest-contentful-paint']?.numericValue,
      tbtMs: audits?.['total-blocking-time']?.numericValue,
      cls: audits?.['cumulative-layout-shift']?.numericValue,
      speedIndexMs: audits?.['speed-index']?.numericValue,
      interactiveMs: audits?.interactive?.numericValue,
    },
    diagnostics: {
      renderBlockingSavingsMs: audits?.['render-blocking-insight']?.details?.overallSavingsMs ?? audits?.['render-blocking-resources']?.details?.overallSavingsMs ?? null,
      unusedJsSavingsBytes: audits?.['unused-javascript']?.details?.overallSavingsBytes ?? null,
      unusedCssSavingsBytes: audits?.['unused-css-rules']?.details?.overallSavingsBytes ?? null,
      totalByteWeight: audits?.['total-byte-weight']?.numericValue ?? null,
    },
  });
}
