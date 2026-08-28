import { NextResponse } from 'next/server';
import { adminJson, resolveAdminSession } from '@/lib/auth/admin-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await resolveAdminSession();
  if (!session) return NextResponse.json({ isAdmin: false }, { status: 403 });
  return adminJson({
    isAdmin: true,
    admin: {
      displayName: session.displayName,
      avatarUrl: session.avatarUrl,
    },
  }, session);
}
