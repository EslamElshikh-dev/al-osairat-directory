import { createSign } from 'node:crypto';

type ReportRow = {
  dimensionValues?: Array<{ value?: string }>;
  metricValues?: Array<{ value?: string }>;
};

type ReportResponse = {
  rows?: ReportRow[];
};

type ComparisonMetrics = {
  activeUsers: number;
  sessions: number;
  views: number;
  keyEvents: number;
};

export type Ga4AdminData = {
  connected: boolean;
  reason?: 'not_configured' | 'api_error';
  summary?: {
    activeUsers: number;
    totalUsers: number;
    newUsers: number;
    sessions: number;
    views: number;
    events: number;
    keyEvents: number;
    engagementRate: number;
  };
  comparison7d?: {
    current: ComparisonMetrics;
    previous: ComparisonMetrics;
  };
  topPages?: Array<{ title: string; views: number; activeUsers: number }>;
  topVillages?: Array<{ title: string; views: number; activeUsers: number }>;
  topCategories?: Array<{ title: string; views: number; activeUsers: number }>;
  sources?: Array<{ sourceMedium: string; sessions: number; activeUsers: number }>;
  locations?: Array<{ country: string; city: string; activeUsers: number }>;
  events?: Array<{ name: string; count: number; keyEvents: number }>;
  conversions?: Array<{ name: string; count: number; keyEvents: number }>;
};

const analyticsScope = 'https://www.googleapis.com/auth/analytics.readonly';
const tokenAudience = 'https://oauth2.googleapis.com/token';
// Property ID is public configuration; service-account credentials stay in Vercel secrets.
const defaultPropertyId = '552007678';
const conversionEventNames = [
  'sign_up',
  'business_submission',
  'ownership_claim',
  'phone_click',
  'whatsapp_click',
  'maps_click',
];
const trackedEventNames = [
  ...conversionEventNames,
  'login',
  'listing_report',
  'directory_search',
  'view_listing',
  'favorite_add',
  'favorite_remove',
];

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function numberValue(value?: string) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getAccessToken(clientEmail: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: analyticsScope,
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
  if (!response.ok) throw new Error('GA4_TOKEN_FAILED');
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error('GA4_TOKEN_MISSING');
  return data.access_token;
}

async function runReport(token: string, propertyId: string, request: Record<string, unknown>) {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('GA4_REPORT_FAILED');
  return response.json() as Promise<ReportResponse>;
}

function readSummary(report: ReportResponse) {
  const values = report.rows?.[0]?.metricValues || [];
  return {
    activeUsers: numberValue(values[0]?.value),
    totalUsers: numberValue(values[1]?.value),
    newUsers: numberValue(values[2]?.value),
    sessions: numberValue(values[3]?.value),
    views: numberValue(values[4]?.value),
    events: numberValue(values[5]?.value),
    keyEvents: numberValue(values[6]?.value),
    engagementRate: numberValue(values[7]?.value),
  };
}

function readComparison(report: ReportResponse): ComparisonMetrics {
  const values = report.rows?.[0]?.metricValues || [];
  return {
    activeUsers: numberValue(values[0]?.value),
    sessions: numberValue(values[1]?.value),
    views: numberValue(values[2]?.value),
    keyEvents: numberValue(values[3]?.value),
  };
}

function pageRows(report: ReportResponse) {
  return (report.rows || []).map((row) => ({
    title: row.dimensionValues?.[0]?.value || '—',
    views: numberValue(row.metricValues?.[0]?.value),
    activeUsers: numberValue(row.metricValues?.[1]?.value),
  }));
}

export async function getGa4AdminData(): Promise<Ga4AdminData> {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim() || defaultPropertyId;
  const clientEmail = process.env.GA4_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawPrivateKey = process.env.GA4_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!clientEmail || !rawPrivateKey) {
    return { connected: false, reason: 'not_configured' };
  }

  try {
    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
    const token = await getAccessToken(clientEmail, privateKey);
    const dateRanges = [{ startDate: '30daysAgo', endDate: 'today' }];
    const comparisonMetrics = [
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'keyEvents' },
    ];

    const [
      summaryReport,
      current7dReport,
      previous7dReport,
      pageReport,
      villageReport,
      categoryReport,
      sourceReport,
      locationReport,
      eventReport,
    ] = await Promise.all([
      runReport(token, propertyId, {
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'eventCount' },
          { name: 'keyEvents' },
          { name: 'engagementRate' },
        ],
      }),
      runReport(token, propertyId, {
        dateRanges: [{ startDate: '6daysAgo', endDate: 'today' }],
        metrics: comparisonMetrics,
      }),
      runReport(token, propertyId, {
        dateRanges: [{ startDate: '13daysAgo', endDate: '7daysAgo' }],
        metrics: comparisonMetrics,
      }),
      runReport(token, propertyId, {
        dateRanges,
        dimensions: [{ name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: '8',
      }),
      runReport(token, propertyId, {
        dateRanges,
        dimensions: [{ name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
        dimensionFilter: {
          filter: {
            fieldName: 'pagePath',
            stringFilter: { matchType: 'BEGINS_WITH', value: '/villages/', caseSensitive: false },
          },
        },
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: '6',
      }),
      runReport(token, propertyId, {
        dateRanges,
        dimensions: [{ name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
        dimensionFilter: {
          filter: {
            fieldName: 'pagePath',
            stringFilter: { matchType: 'BEGINS_WITH', value: '/directory/', caseSensitive: false },
          },
        },
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: '6',
      }),
      runReport(token, propertyId, {
        dateRanges,
        dimensions: [{ name: 'sessionSourceMedium' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '8',
      }),
      runReport(token, propertyId, {
        dateRanges,
        dimensions: [{ name: 'country' }, { name: 'city' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: '8',
      }),
      runReport(token, propertyId, {
        dateRanges,
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }, { name: 'keyEvents' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            inListFilter: { values: trackedEventNames },
          },
        },
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: '20',
      }),
    ]);

    const events = (eventReport.rows || []).map((row) => ({
      name: row.dimensionValues?.[0]?.value || '—',
      count: numberValue(row.metricValues?.[0]?.value),
      keyEvents: numberValue(row.metricValues?.[1]?.value),
    }));
    const conversions = events
      .filter((item) => conversionEventNames.includes(item.name))
      .sort((a, b) => b.count - a.count);

    return {
      connected: true,
      summary: readSummary(summaryReport),
      comparison7d: {
        current: readComparison(current7dReport),
        previous: readComparison(previous7dReport),
      },
      topPages: pageRows(pageReport),
      topVillages: pageRows(villageReport),
      topCategories: pageRows(categoryReport),
      sources: (sourceReport.rows || []).map((row) => ({
        sourceMedium: row.dimensionValues?.[0]?.value || '—',
        sessions: numberValue(row.metricValues?.[0]?.value),
        activeUsers: numberValue(row.metricValues?.[1]?.value),
      })),
      locations: (locationReport.rows || []).map((row) => ({
        country: row.dimensionValues?.[0]?.value || '—',
        city: row.dimensionValues?.[1]?.value || '—',
        activeUsers: numberValue(row.metricValues?.[0]?.value),
      })),
      events,
      conversions,
    };
  } catch {
    return { connected: false, reason: 'api_error' };
  }
}
