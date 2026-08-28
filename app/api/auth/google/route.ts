import { NextResponse } from 'next/server';
import { SUPABASE_URL } from '@/lib/auth/supabase-rest';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const authorizeUrl = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
  authorizeUrl.searchParams.set('provider', 'google');
  authorizeUrl.searchParams.set('redirect_to', `${origin}/account/oauth-callback`);
  return NextResponse.redirect(authorizeUrl);
}
