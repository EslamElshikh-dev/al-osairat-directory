import { adminJson, adminRestHeaders, resolveAdminSession } from '@/lib/auth/admin-server';
import { SUPABASE_URL } from '@/lib/auth/supabase-rest';
import { getGa4AdminData } from '@/lib/analytics/google-analytics-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await resolveAdminSession();
  if (!session) return adminJson({ error: 'يلزم تسجيل الدخول بحساب إداري.' }, null, 401);

  const databaseRequest = fetch(`${SUPABASE_URL}/rest/v1/rpc/get_admin_analytics_stats`, {
    method: 'POST',
    headers: adminRestHeaders(session.accessToken, true),
    body: '{}',
    cache: 'no-store',
  });

  const [databaseResponse, ga4] = await Promise.all([
    databaseRequest,
    getGa4AdminData(),
  ]);

  if (!databaseResponse.ok) {
    return adminJson({ error: 'تعذر تحميل إحصاءات قاعدة البيانات.' }, session, 500);
  }

  const database = await databaseResponse.json();

  return adminJson({ database, ga4 }, session);
}
