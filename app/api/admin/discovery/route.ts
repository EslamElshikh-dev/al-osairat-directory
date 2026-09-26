import { adminJson, adminRestHeaders, resolveAdminSession } from '@/lib/auth/admin-server';
import { SUPABASE_URL } from '@/lib/auth/supabase-rest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await resolveAdminSession();
  if (!session) return adminJson({ error: 'يلزم تسجيل الدخول بحساب إداري.' }, null, 401);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_osairat_discovery_insights`, {
      method: 'POST',
      headers: adminRestHeaders(session.accessToken, true),
      body: '{}',
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return adminJson({ error: 'تعذر قراءة مؤشرات الزيارة والبحث.' }, session, 503);
    return adminJson(await response.json(), session);
  } catch {
    return adminJson({ error: 'تعذر الاتصال ببيانات الدليل الآن.' }, session, 503);
  }
}
