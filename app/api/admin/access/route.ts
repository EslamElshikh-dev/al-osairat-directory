import { adminJson, resolveAdminSession } from '@/lib/auth/admin-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await resolveAdminSession();
  if (!session) return adminJson({ isAdmin: false }, null, 403);
  return adminJson({
    isAdmin: true,
    admin: {
      displayName: session.displayName,
      avatarUrl: session.avatarUrl,
    },
  }, session);
}
