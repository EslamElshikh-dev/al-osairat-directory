'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type CountGroup = Record<string, number>;

type DatabaseAnalytics = {
  members: { total: number; verified: number; last7d: number; previous7d: number; last30d: number; profiles: number };
  engagement: { favorites: number; notifications: number; unreadNotifications: number };
  submissions: CountGroup;
  claims: CountGroup;
  reports: CountGroup;
  changes: CountGroup;
  directory: { publishedBusinesses: number; approvedOwnerships: number };
  registrationSeries: Array<{ date: string; count: number }>;
  activitySeries: Array<{ date: string; submissions: number; claims: number; reports: number }>;
  generatedAt: string;
};

type ComparisonMetrics = {
  activeUsers: number;
  sessions: number;
  views: number;
  keyEvents: number;
};

type Ga4Analytics = {
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
  comparison7d?: { current: ComparisonMetrics; previous: ComparisonMetrics };
  topPages?: Array<{ title: string; views: number; activeUsers: number }>;
  topVillages?: Array<{ title: string; views: number; activeUsers: number }>;
  topCategories?: Array<{ title: string; views: number; activeUsers: number }>;
  sources?: Array<{ sourceMedium: string; sessions: number; activeUsers: number }>;
  locations?: Array<{ country: string; city: string; activeUsers: number }>;
  events?: Array<{ name: string; count: number; keyEvents: number }>;
  conversions?: Array<{ name: string; count: number; keyEvents: number }>;
  webVitals?: Array<{
    name: string;
    samples: number;
    average: number;
    goodRate: number;
    needsImprovementRate: number;
    poorRate: number;
  }>;
};

type AnalyticsPayload = {
  database: DatabaseAnalytics;
  ga4: Ga4Analytics;
};

const eventLabels: Record<string, string> = {
  sign_up: 'تسجيل عضو جديد',
  business_submission: 'طلب إضافة نشاط',
  ownership_claim: 'مطالبة ملكية نشاط',
  phone_click: 'ضغطات الاتصال',
  whatsapp_click: 'ضغطات واتساب',
  maps_click: 'فتح خرائط Google',
  login: 'تسجيل الدخول',
  listing_report: 'بلاغ عن بيانات نشاط',
  directory_search: 'البحث داخل الدليل',
  view_listing: 'فتح صفحة نشاط',
  favorite_add: 'إضافة للمفضلة',
  favorite_remove: 'إزالة من المفضلة',
};

const webVitalLabels: Record<string, string> = {
  LCP: 'LCP — ظهور المحتوى الرئيسي',
  INP: 'INP — سرعة الاستجابة للتفاعل',
  CLS: 'CLS — ثبات التصميم',
  TTFB: 'TTFB — استجابة الخادم',
  FCP: 'FCP — ظهور أول محتوى',
  FID: 'FID — تأخر أول تفاعل',
};

function n(value: number | undefined) {
  return Number(value || 0).toLocaleString('ar-EG');
}

function percent(value: number | undefined) {
  return `${((value || 0) * 100).toLocaleString('ar-EG', { maximumFractionDigits: 1 })}%`;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

function formatWebVital(name: string, value: number) {
  if (name === 'CLS') {
    return value.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  }
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ث`;
  }
  return `${Math.round(value).toLocaleString('ar-EG')} مللي ثانية`;
}

function cleanTitle(value: string) {
  return value.split('|')[0]?.trim() || value;
}

function growth(current: number, previous: number) {
  if (current === previous) return { label: 'بدون تغيير', className: 'is-flat' };
  if (previous === 0) return { label: current > 0 ? 'بداية جديدة' : 'بدون تغيير', className: current > 0 ? 'is-up' : 'is-flat' };
  const rate = ((current - previous) / previous) * 100;
  const sign = rate > 0 ? '+' : '';
  return {
    label: `${sign}${rate.toLocaleString('ar-EG', { maximumFractionDigits: 1 })}%`,
    className: rate > 0 ? 'is-up' : 'is-down',
  };
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="analytics-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  );
}

function GrowthBadge({ current, previous }: { current: number; previous: number }) {
  const meta = growth(current, previous);
  return <span className={`analytics-growth ${meta.className}`}>{meta.label}</span>;
}

function ComparisonCard({ label, current, previous }: { label: string; current: number; previous: number }) {
  return (
    <article className="analytics-comparison-card">
      <div className="analytics-comparison-card__top">
        <span>{label}</span>
        <GrowthBadge current={current} previous={previous} />
      </div>
      <strong>{n(current)}</strong>
      <small>الفترة السابقة: {n(previous)}</small>
    </article>
  );
}

function MiniBars({ values }: { values: Array<{ date: string; count: number }> }) {
  const max = Math.max(1, ...values.map((item) => item.count));
  return (
    <div className="analytics-mini-bars" aria-label="التسجيلات خلال آخر 14 يومًا">
      {values.map((item) => (
        <div className="analytics-mini-bars__item" key={item.date} title={`${item.date}: ${item.count}`}>
          <span style={{ height: `${Math.max(item.count ? 12 : 4, (item.count / max) * 100)}%` }} />
          <small>{new Date(item.date).getDate().toLocaleString('ar-EG')}</small>
        </div>
      ))}
    </div>
  );
}

function RankedList({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string;
  title: string;
  items: Array<{ label: string; value: number; secondary?: string }>;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <section className="analytics-rank-card">
      <div className="analytics-rank-card__head">
        <span>{eyebrow}</span>
        <h3>{title}</h3>
      </div>
      {items.length ? (
        <div className="analytics-rank-list">
          {items.map((item, index) => (
            <div className="analytics-rank-row" key={`${title}-${item.label}-${index}`}>
              <div className="analytics-rank-row__line">
                <span className="analytics-rank-index">{(index + 1).toLocaleString('ar-EG')}</span>
                <div className="analytics-rank-copy">
                  <strong>{item.label}</strong>
                  {item.secondary && <small>{item.secondary}</small>}
                </div>
                <b>{n(item.value)}</b>
              </div>
              <div className="analytics-rank-track"><span style={{ width: `${Math.max(7, (item.value / max) * 100)}%` }} /></div>
            </div>
          ))}
        </div>
      ) : <div className="analytics-table-empty">لا توجد بيانات كافية بعد.</div>}
    </section>
  );
}

function DataTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <section className="analytics-table-card">
      <div className="analytics-table-card__head"><h3>{title}</h3></div>
      {rows.length ? (
        <div className="analytics-table-scroll">
          <table>
            <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="analytics-table-empty">لا توجد بيانات كافية بعد.</div>}
    </section>
  );
}

export function AdminAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/analytics', { cache: 'no-store', credentials: 'same-origin' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'تعذر تحميل الإحصاءات.');
      setData(payload as AnalyticsPayload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل الإحصاءات.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openWork = useMemo(() => {
    if (!data) return 0;
    return (data.database.submissions.pending || 0)
      + (data.database.submissions.needsChanges || 0)
      + (data.database.claims.pending || 0)
      + (data.database.claims.needsChanges || 0)
      + (data.database.reports.pending || 0)
      + (data.database.reports.reviewing || 0)
      + (data.database.changes.pending || 0)
      + (data.database.changes.needsChanges || 0);
  }, [data]);

  if (loading && !data) {
    return <section id="analytics-overview" className="analytics-admin analytics-admin--loading"><span /><p>جاري تجميع الإحصاءات الفعلية…</p></section>;
  }

  if (error && !data) {
    return <section id="analytics-overview" className="analytics-admin"><div className="analytics-admin-error">{error}<button type="button" onClick={() => void load()}>إعادة المحاولة</button></div></section>;
  }

  if (!data) return null;

  const db = data.database;
  const ga = data.ga4;
  const webVitals = ga.webVitals || [];
  const comparison = ga.comparison7d;
  const memberGrowth = growth(db.members.last7d, db.members.previous7d);
  const conversionTotal = (ga.conversions || []).reduce((sum, item) => sum + item.count, 0);

  return (
    <section id="analytics-overview" className="analytics-admin" aria-labelledby="analytics-admin-title">
      <div className="analytics-admin__hero">
        <div>
          <span className="analytics-admin__eyebrow">مركز القرار</span>
          <h1 id="analytics-admin-title">إحصاءات دليل العسيرات</h1>
          <p>لوحة تشغيلية تجمع نمو المجتمع، أداء الزيارات، أكثر القرى والأقسام طلبًا، والتحويلات المهمة في مكان واحد.</p>
        </div>
        <div className="analytics-admin__actions">
          <span className="analytics-live-chip">Supabase مباشر</span>
          <span className={`analytics-live-chip ${ga.connected ? 'is-connected' : 'is-pending'}`}>{ga.connected ? 'GA4 متصل' : 'GA4 يحتاج ربط'}</span>
          <button type="button" onClick={() => void load()} disabled={loading}>{loading ? 'تحديث…' : 'تحديث البيانات'}</button>
        </div>
      </div>

      <div className="analytics-admin__meta">
        <span>آخر تجميع: {formatDate(db.generatedAt)}</span>
        <span>طلبات تحتاج تدخلك الآن: <b>{n(openWork)}</b></span>
      </div>

      {ga.connected && comparison && (
        <>
          <div className="analytics-section-heading analytics-section-heading--decision"><div><span>آخر 7 أيام</span><h2>هل الدليل ينمو مقارنة بالأسبوع السابق؟</h2></div></div>
          <div className="analytics-comparison-grid">
            <ComparisonCard label="المستخدمون النشطون" current={comparison.current.activeUsers} previous={comparison.previous.activeUsers} />
            <ComparisonCard label="الجلسات" current={comparison.current.sessions} previous={comparison.previous.sessions} />
            <ComparisonCard label="المشاهدات" current={comparison.current.views} previous={comparison.previous.views} />
            <ComparisonCard label="الأحداث الرئيسية" current={comparison.current.keyEvents} previous={comparison.previous.keyEvents} />
          </div>
        </>
      )}

      {ga.connected && (
        <>
          <div className="analytics-section-heading analytics-section-heading--decision">
            <div><span>أداء حقيقي من أجهزة الزوار</span><h2>Core Web Vitals — آخر 30 يومًا</h2></div>
          </div>
          {webVitals.length ? (
            <div className="analytics-metric-grid">
              {webVitals.map((metric) => (
                <MetricCard
                  key={metric.name}
                  label={webVitalLabels[metric.name] || metric.name}
                  value={`${percent(metric.goodRate)} جيد`}
                  hint={`متوسط ${formatWebVital(metric.name, metric.average)} · ${percent(metric.poorRate)} ضعيف · ${n(metric.samples)} عينة`}
                />
              ))}
            </div>
          ) : (
            <div className="analytics-ga-setup">
              <div className="analytics-ga-setup__icon" aria-hidden="true">⚡</div>
              <div>
                <strong>بدأ جمع مؤشرات الأداء الفعلية</strong>
                <p>ستظهر المتوسطات ونسبة الحالات الجيدة هنا تلقائيًا بعد وصول أول عينات من زيارات الموقع.</p>
              </div>
            </div>
          )}
        </>
      )}

      <div className="analytics-section-heading"><div><span>نمو المجتمع</span><h2>الأعضاء والتسجيلات</h2></div></div>
      <div className="analytics-member-insight">
        <div className="analytics-member-insight__summary">
          <span>تسجيلات آخر 7 أيام</span>
          <strong>{n(db.members.last7d)}</strong>
          <div className="analytics-member-insight__change">
            <span className={`analytics-growth ${memberGrowth.className}`}>{memberGrowth.label}</span>
            <small>مقابل {n(db.members.previous7d)} في الـ7 أيام السابقة</small>
          </div>
        </div>
        <div className="analytics-member-insight__chart">
          <div className="analytics-trend-card__head"><div><span>آخر 14 يومًا</span><h3>إيقاع التسجيل اليومي</h3></div><strong>{n(db.registrationSeries.reduce((sum, item) => sum + item.count, 0))}</strong></div>
          <MiniBars values={db.registrationSeries} />
        </div>
      </div>

      <div className="analytics-metric-grid">
        <MetricCard label="إجمالي الأعضاء" value={n(db.members.total)} hint="من auth.users" />
        <MetricCard label="حسابات موثقة" value={n(db.members.verified)} />
        <MetricCard label="تسجيلات آخر 30 يومًا" value={n(db.members.last30d)} />
        <MetricCard label="ملفات أعضاء" value={n(db.members.profiles)} />
        <MetricCard label="المفضلة" value={n(db.engagement.favorites)} />
        <MetricCard label="إشعارات غير مقروءة" value={n(db.engagement.unreadNotifications)} />
      </div>

      {ga.connected && (
        <>
          <div className="analytics-section-heading analytics-section-heading--demand"><div><span>الطلب الحقيقي</span><h2>أين يذهب اهتمام الزوار؟</h2></div></div>
          <div className="analytics-insight-grid">
            <RankedList
              eyebrow="حسب المشاهدات — 30 يومًا"
              title="أعلى القرى"
              items={(ga.topVillages || []).map((item) => ({
                label: cleanTitle(item.title),
                value: item.views,
                secondary: `${n(item.activeUsers)} مستخدم نشط`,
              }))}
            />
            <RankedList
              eyebrow="حسب المشاهدات — 30 يومًا"
              title="أعلى الأقسام"
              items={(ga.topCategories || []).map((item) => ({
                label: cleanTitle(item.title),
                value: item.views,
                secondary: `${n(item.activeUsers)} مستخدم نشط`,
              }))}
            />
          </div>

          <div className="analytics-section-heading"><div><span>التحويلات</span><h2>أكثر الأحداث المهمة استخدامًا</h2></div></div>
          <RankedList
            eyebrow={`إجمالي تفاعلات التحويل: ${n(conversionTotal)}`}
            title="ترتيب التحويلات خلال آخر 30 يومًا"
            items={(ga.conversions || []).map((item) => ({
              label: eventLabels[item.name] || item.name,
              value: item.count,
              secondary: `${n(item.keyEvents)} حدث رئيسي · ${conversionTotal ? ((item.count / conversionTotal) * 100).toLocaleString('ar-EG', { maximumFractionDigits: 1 }) : '٠'}% من تفاعلات التحويل`,
            }))}
          />
        </>
      )}

      <div className="analytics-section-heading"><div><span>تشغيل الدليل</span><h2>الطلبات والمراجعات</h2></div></div>
      <div className="analytics-metric-grid analytics-metric-grid--operations">
        <MetricCard label="طلبات إضافة نشاط" value={n(db.submissions.total)} hint={`${n(db.submissions.pending)} قيد المراجعة`} />
        <MetricCard label="مطالبات الملكية" value={n(db.claims.total)} hint={`${n(db.claims.pending)} قيد المراجعة`} />
        <MetricCard label="بلاغات البيانات" value={n(db.reports.total)} hint={`${n((db.reports.pending || 0) + (db.reports.reviewing || 0))} مفتوحة`} />
        <MetricCard label="طلبات التعديل" value={n(db.changes.total)} hint={`${n(db.changes.pending)} قيد المراجعة`} />
        <MetricCard label="أنشطة منشورة" value={n(db.directory.publishedBusinesses)} />
        <MetricCard label="ملكيات معتمدة" value={n(db.directory.approvedOwnerships)} />
        <MetricCard label="إشعارات الأعضاء" value={n(db.engagement.notifications)} hint={`${n(db.engagement.unreadNotifications)} غير مقروءة`} />
      </div>

      <div className="analytics-status-grid">
        <DataTable
          title="حالة طلبات إضافة الأنشطة"
          columns={['الحالة', 'العدد']}
          rows={[
            ['قيد المراجعة', n(db.submissions.pending)],
            ['يحتاج استكمال', n(db.submissions.needsChanges)],
            ['مقبول', n(db.submissions.approved)],
            ['مرفوض', n(db.submissions.rejected)],
          ]}
        />
        <DataTable
          title="حالة البلاغات"
          columns={['الحالة', 'العدد']}
          rows={[
            ['قيد الانتظار', n(db.reports.pending)],
            ['تحت المراجعة', n(db.reports.reviewing)],
            ['تم الحل', n(db.reports.resolved)],
            ['مرفوض', n(db.reports.rejected)],
          ]}
        />
      </div>

      <div className="analytics-section-heading analytics-section-heading--ga"><div><span>Google Analytics 4</span><h2>التفاصيل الكاملة — آخر 30 يومًا</h2></div></div>

      {ga.connected && ga.summary ? (
        <>
          <div className="analytics-metric-grid">
            <MetricCard label="مستخدمون نشطون" value={n(ga.summary.activeUsers)} />
            <MetricCard label="إجمالي المستخدمين" value={n(ga.summary.totalUsers)} />
            <MetricCard label="مستخدمون جدد" value={n(ga.summary.newUsers)} />
            <MetricCard label="الجلسات" value={n(ga.summary.sessions)} />
            <MetricCard label="المشاهدات" value={n(ga.summary.views)} />
            <MetricCard label="الأحداث الرئيسية" value={n(ga.summary.keyEvents)} />
            <MetricCard label="معدل التفاعل" value={percent(ga.summary.engagementRate)} />
            <MetricCard label="إجمالي الأحداث" value={n(ga.summary.events)} />
          </div>

          <div className="analytics-table-grid">
            <DataTable title="أهم الصفحات" columns={['الصفحة', 'المشاهدات', 'المستخدمون']} rows={(ga.topPages || []).map((item) => [cleanTitle(item.title), n(item.views), n(item.activeUsers)])} />
            <DataTable title="مصادر الجلسات" columns={['المصدر / الوسيط', 'الجلسات', 'المستخدمون']} rows={(ga.sources || []).map((item) => [item.sourceMedium, n(item.sessions), n(item.activeUsers)])} />
            <DataTable title="المواقع الجغرافية" columns={['الدولة', 'المدينة', 'المستخدمون']} rows={(ga.locations || []).map((item) => [item.country, item.city, n(item.activeUsers)])} />
            <DataTable title="كل أحداث الدليل" columns={['الحدث', 'الإجمالي', 'رئيسي']} rows={(ga.events || []).map((item) => [eventLabels[item.name] || item.name, n(item.count), n(item.keyEvents)])} />
          </div>
        </>
      ) : (
        <div className="analytics-ga-setup">
          <div className="analytics-ga-setup__icon" aria-hidden="true">G</div>
          <div>
            <strong>{ga.reason === 'api_error' ? 'تعذر الاتصال بـ Google Analytics Data API' : 'بيانات GA4 لم تُربط بلوحة الإدارة بعد'}</strong>
            <p>تتبّع GA4 على الموقع مستمر ويعمل بالفعل. عرض الأرقام هنا يحتاج صلاحية قراءة منفصلة عبر Data API.</p>
            <div className="analytics-ga-env">
              <code>GA4_SERVICE_ACCOUNT_EMAIL</code>
              <code>GA4_SERVICE_ACCOUNT_PRIVATE_KEY</code>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
