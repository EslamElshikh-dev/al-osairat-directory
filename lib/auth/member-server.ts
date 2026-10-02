import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE, SUPABASE_PUBLISHABLE_KEY, authCookieBase, getUser, mapMember, refreshSession } from './supabase-rest';

export async function resolveMemberSession() {
  const store = await cookies();
  const token = store.get(AUTH_ACCESS_COOKIE)?.value;
  if (token) { try { return { accessToken: token, member: mapMember(await getUser(token)), refreshed: null }; } catch {} }
  const refreshToken = store.get(AUTH_REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  try {
    const refreshed = await refreshSession(refreshToken);
    return { accessToken: refreshed.access_token, member: mapMember(refreshed.user), refreshed };
  } catch { return null; }
}
export function memberHeaders(accessToken?: string) {
  return { apikey: SUPABASE_PUBLISHABLE_KEY, ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };
}
export function memberJson(body: unknown, session: Awaited<ReturnType<typeof resolveMemberSession>>, status=200) {
  const response = NextResponse.json(body, {status, headers:{'Cache-Control':'private, no-store',Vary:'Cookie'}});
  if (session?.refreshed) {
    response.cookies.set(AUTH_ACCESS_COOKIE,session.refreshed.access_token,{...authCookieBase,maxAge:Math.max(300,(session.refreshed.expires_in||3600)-60)});
    response.cookies.set(AUTH_REFRESH_COOKIE,session.refreshed.refresh_token,{...authCookieBase,maxAge:60*60*24*30});
  }
  return response;
}
