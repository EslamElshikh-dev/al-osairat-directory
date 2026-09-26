import { NextResponse } from 'next/server';
import { jobAreas } from '@/lib/jobs-geography';
import { SUPABASE_URL, sameOrigin } from '@/lib/auth/supabase-rest';
import { adminJson, adminRestHeaders, resolveAdminSession } from '@/lib/auth/admin-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const villagesSet = new Set(jobAreas);
const fields = 'id,kind,origin,title,organization,village,field,description,experience,work_type,contact_kind,contact_value,source_name,source_url,status,created_at,published_at,expires_at';
function clean(value: unknown, max: number) { return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : ''; }

export async function GET() {
  const session = await resolveAdminSession();
  if (!session) return adminJson({ error: 'غير مصرح.' }, null, 403);
  const response = await fetch(`${SUPABASE_URL}/rest/v1/osairat_jobs?select=${fields}&order=created_at.desc&limit=100`, {
    headers: adminRestHeaders(session.accessToken), cache: 'no-store',
  }).catch(() => null);
  if (!response?.ok) return adminJson({ error: 'تعذر تحميل الإعلانات.' }, session, 502);
  return adminJson({ jobs: await response.json() }, session);
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const session = await resolveAdminSession();
  if (!session) return adminJson({ error: 'غير مصرح.' }, null, 403);
  const body = await request.json().catch(() => ({}));
  const id = clean(body.id, 40);
  const status = clean(body.status, 15);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !['approved', 'rejected'].includes(status)) return adminJson({ error: 'طلب غير صالح.' }, session, 400);
  const params = new URLSearchParams({ id: `eq.${id}`, status: 'eq.pending', select: 'id' });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/osairat_jobs?${params}`, {
    method: 'PATCH', headers: { ...adminRestHeaders(session.accessToken, true), Prefer: 'return=representation' },
    body: JSON.stringify({ status, published_at: status === 'approved' ? new Date().toISOString() : null }), cache: 'no-store',
  }).catch(() => null);
  if (!response?.ok) return adminJson({ error: 'تعذر مراجعة الإعلان.' }, session, 502);
  const updated = await response.json() as Array<{ id: string }>;
  if (!updated.length) return adminJson({ error: 'الإعلان لم يعد قيد المراجعة.' }, session, 409);
  return adminJson({ ok: true }, session);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  const session = await resolveAdminSession();
  if (!session) return adminJson({ error: 'غير مصرح.' }, null, 403);
  const body = await request.json().catch(() => ({}));
  const title = clean(body.title, 160), village = clean(body.village, 100), field = clean(body.field, 80);
  const description = clean(body.description, 2000), organization = clean(body.organization, 120);
  const sourceName = clean(body.sourceName, 120), sourceUrl = clean(body.sourceUrl, 500);
  if (title.length < 5 || !villagesSet.has(village) || field.length < 2 || description.length < 20 || !sourceName) {
    return adminJson({ error: 'اكمل عنوان الفرصة ومنطقة العمل والمصدر والتفاصيل.' }, session, 400);
  }
  let url: URL;
  try { url = new URL(sourceUrl); } catch { return adminJson({ error: 'رابط المصدر غير صحيح.' }, session, 400); }
  if (url.protocol !== 'https:') return adminJson({ error: 'رابط المصدر لازم يبدأ بـ https.' }, session, 400);
  const response = await fetch(`${SUPABASE_URL}/rest/v1/osairat_jobs`, {
    method: 'POST', headers: { ...adminRestHeaders(session.accessToken, true), Prefer: 'return=minimal' }, cache: 'no-store',
    body: JSON.stringify({
      user_id: session.userId, kind: 'offer', origin: 'external', title, organization: organization || null,
      village, field, description, contact_kind: 'link', contact_value: sourceUrl,
      source_name: sourceName, source_url: sourceUrl, status: 'approved', published_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
    }),
  }).catch(() => null);
  if (!response?.ok) return adminJson({ error: 'تعذر إضافة الإعلان الخارجي.' }, session, 502);
  return adminJson({ ok: true }, session, 201);
}
