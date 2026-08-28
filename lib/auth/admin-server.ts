import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  authCookieBase,
  getUser,
  mapMember,
  refreshSession,
} from '@/lib/auth/supabase-rest';

export type AdminSession = {
  accessToken: string;
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  refreshed?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};

export function adminRestHeaders(accessToken: string, json = false) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

async function checkAdmin(accessToken: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_directory_admin`, {
    method: 'POST',
    headers: adminRestHeaders(accessToken, true),
    body: '{}',
    cache: 'no-store',
  });
  if (!response.ok) return false;
  return Boolean(await response.json());
}

export async function resolveAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const accessToken = store.get(AUTH_ACCESS_COOKIE)?.value;
  const refreshToken = store.get(AUTH_REFRESH_COOKIE)?.value;

  if (accessToken) {
    try {
      const member = mapMember(await getUser(accessToken));
      if (await checkAdmin(accessToken)) {
        return {
          accessToken,
          userId: member.localId,
          displayName: member.displayName,
          email: member.email,
          avatarUrl: member.avatarUrl,
        };
      }
      return null;
    } catch {
      // Continue with refresh token if available.
    }
  }

  if (!refreshToken) return null;

  try {
    const session = await refreshSession(refreshToken);
    const member = mapMember(session.user);
    if (!(await checkAdmin(session.access_token))) return null;
    return {
      accessToken: session.access_token,
      userId: member.localId,
      displayName: member.displayName,
      email: member.email,
      avatarUrl: member.avatarUrl,
      refreshed: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresIn: session.expires_in || 3600,
      },
    };
  } catch {
    return null;
  }
}

export function adminJson(payload: unknown, session: AdminSession | null, status = 200) {
  const response = NextResponse.json(payload, { status });
  if (session?.refreshed) {
    response.cookies.set(AUTH_ACCESS_COOKIE, session.refreshed.accessToken, {
      ...authCookieBase,
      maxAge: Math.max(300, session.refreshed.expiresIn - 60),
    });
    response.cookies.set(AUTH_REFRESH_COOKIE, session.refreshed.refreshToken, {
      ...authCookieBase,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}
