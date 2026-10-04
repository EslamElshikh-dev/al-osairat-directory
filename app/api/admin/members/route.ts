import { adminJson, adminRestHeaders, resolveAdminSession } from '@/lib/auth/admin-server';
import { SUPABASE_URL } from '@/lib/auth/supabase-rest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await resolveAdminSession();
  if (!session) return adminJson({ error: 'يلزم تسجيل الدخول بحساب إداري.' }, null, 401);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_osairat_member_accounts`, {
      method: 'POST',
      headers: adminRestHeaders(session.accessToken, true),
      body: '{}',
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('MEMBERS_READ_FAILED');
    return adminJson({ members: await response.json() }, session);
  } catch {
    return adminJson({ error: 'تعذر تحميل الحسابات المسجلة الآن.' }, session, 503);
  }
}
