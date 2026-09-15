import { createSign } from 'node:crypto';

type SearchAnalyticsRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type SearchAnalyticsResponse = {
  rows?: SearchAnalyticsRow[];
};

type SearchMetrics = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchConsoleAdminData = {
  connected: boolean;
  reason?: 'not_configured' | 'api_error';
  siteUrl?: string;
  settledWindow?: { startDate: string; endDate: string };
  comparison7d?: { current: SearchMetrics; previous: SearchMetrics };
  topQueries?: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
  topPages?: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>;
};

const searchConsoleScope = 'https://www.googleapis.com/auth/webmasters.readonly';
const tokenAudience = 'https://oauth2.googleapis.com/token';
const defaultSiteUrl = 'sc-domain:usayrat.online';

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days: number) {
  const value = new Date();
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() - days);
  return isoDate(value);
}

async function getAccessToken(clientEmail: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: searchConsoleScope,
    aud: tokenAudience,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey).toString('base64url');
  const assertion = `${unsigned}.${signature}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
  const response = await fetch(tokenAudience, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('GSC_TOKEN_FAILED');
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error('GSC_TOKEN_MISSING');
  return data.access_token;
}

async function querySearchConsole(
  token: string,
  siteUrl: string,
  request: Record<string, unknown>,
) {
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('GSC_REPORT_FAILED');
  return response.json() as Promise<SearchAnalyticsResponse>;
}

function metrics(report: SearchAnalyticsResponse): SearchMetrics {
  const row = report.rows?.[0];
  return {
    clicks: Number(row?.clicks || 0),
    impressions: Number(row?.impressions || 0),
    ctr: Number(row?.ctr || 0),
    position: Number(row?.position || 0),
  };
}

function rowMetrics(row: SearchAnalyticsRow) {
  return {
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0),
  };
}

export async function getSearchConsoleAdminData(): Promise<SearchConsoleAdminData> {
  const siteUrl = process.env.GSC_SITE_URL?.trim() || defaultSiteUrl;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim()
    || process.env.GA4_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    || process.env.GA4_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !rawPrivateKey) {
    return { connected: false, reason: 'not_configured', siteUrl };
  }

  try {
    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
    const token = await getAccessToken(clientEmail, privateKey);

    // Search Console commonly settles a few days late. Use the latest seven-day
    // window ending three days ago so weekly comparisons are not distorted by
    // incomplete fresh data.
    const currentStart = daysAgo(9);
    const currentEnd = daysAgo(3);
    const previousStart = daysAgo(16);
    const previousEnd = daysAgo(10);

    const [currentReport, previousReport, queryReport, pageReport] = await Promise.all([
      querySearchConsole(token, siteUrl, {
        startDate: currentStart,
        endDate: currentEnd,
        searchType: 'web',
        rowLimit: 1,
      }),
      querySearchConsole(token, siteUrl, {
        startDate: previousStart,
        endDate: previousEnd,
        searchType: 'web',
        rowLimit: 1,
      }),
      querySearchConsole(token, siteUrl, {
        startDate: currentStart,
        endDate: currentEnd,
        searchType: 'web',
        dimensions: ['query'],
        rowLimit: 10,
      }),
      querySearchConsole(token, siteUrl, {
        startDate: currentStart,
        endDate: currentEnd,
        searchType: 'web',
        dimensions: ['page'],
        rowLimit: 10,
      }),
    ]);

    return {
      connected: true,
      siteUrl,
      settledWindow: { startDate: currentStart, endDate: currentEnd },
      comparison7d: {
        current: metrics(currentReport),
        previous: metrics(previousReport),
      },
      topQueries: (queryReport.rows || []).map((row) => ({
        query: row.keys?.[0] || '—',
        ...rowMetrics(row),
      })),
      topPages: (pageReport.rows || []).map((row) => ({
        page: row.keys?.[0] || '—',
        ...rowMetrics(row),
      })),
    };
  } catch {
    return { connected: false, reason: 'api_error', siteUrl };
  }
}
