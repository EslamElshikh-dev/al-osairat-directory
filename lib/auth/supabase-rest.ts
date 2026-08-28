export const SUPABASE_URL = 'https://vddoeiggfcwllfxpirep.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZpjxAzWkEPl2jfJg17iRVg_XYdIs2pO';

export const AUTH_ACCESS_COOKIE = 'osayrat_sb_access';
export const AUTH_REFRESH_COOKIE = 'osayrat_sb_refresh';

export type MemberUser = {
  localId: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  avatarUrl: string;
};

type SupabaseUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: { full_name?: string; name?: string; avatar_url?: string; picture?: string };
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user: SupabaseUser;
};

export class SupabaseAuthError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = '') {
    super(message);
    this.name = 'SupabaseAuthError';
    this.status = status;
    this.code = code;
  }
}

function headers(accessToken?: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_PUBLISHABLE_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function authRequest<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    ...init,
    headers: { ...headers(accessToken), ...(init.headers || {}) },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.msg === 'string' ? data.msg : typeof data?.message === 'string' ? data.message : 'AUTH_REQUEST_FAILED';
    const code = typeof data?.error_code === 'string' ? data.error_code : typeof data?.code === 'string' ? data.code : '';
    throw new SupabaseAuthError(message, response.status, code);
  }
  return data as T;
}

export function mapMember(user: SupabaseUser): MemberUser {
  const displayName = user.user_metadata?.full_name?.trim() || user.user_metadata?.name?.trim() || 'عضو دليل العسيرات';
  const avatarUrl = user.user_metadata?.avatar_url?.trim() || user.user_metadata?.picture?.trim() || '';
  return {
    localId: user.id,
    email: user.email || '',
    displayName,
    emailVerified: Boolean(user.email_confirmed_at),
    avatarUrl,
  };
}

export async function signUp(email: string, password: string, name: string, redirectTo: string) {
  const query = `signup?redirect_to=${encodeURIComponent(redirectTo)}`;
  return authRequest<{ user: SupabaseUser; access_token?: string; refresh_token?: string; expires_in?: number }>(query, {
    method: 'POST',
    body: JSON.stringify({ email, password, data: { full_name: name } }),
  });
}

export async function signIn(email: string, password: string) {
  return authRequest<TokenResponse>('token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getUser(accessToken: string) {
  return authRequest<SupabaseUser>('user', { method: 'GET' }, accessToken);
}

export async function refreshSession(refreshToken: string) {
  return authRequest<TokenResponse>('token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export async function recoverPassword(email: string, redirectTo: string) {
  return authRequest('recover', {
    method: 'POST',
    body: JSON.stringify({ email, redirect_to: redirectTo }),
  });
}

export async function updatePassword(accessToken: string, password: string) {
  return authRequest<SupabaseUser>('user', {
    method: 'PUT',
    body: JSON.stringify({ password }),
  }, accessToken);
}

export async function updateUserMetadata(accessToken: string, data: { full_name?: string }) {
  return authRequest<SupabaseUser>('user', {
    method: 'PUT',
    body: JSON.stringify({ data }),
  }, accessToken);
}

export async function remoteSignOut(accessToken: string) {
  return authRequest('logout', { method: 'POST' }, accessToken);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export const authCookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export function authErrorMessage(error: unknown) {
  if (!(error instanceof SupabaseAuthError)) return 'تعذر إتمام العملية الآن. حاول مرة أخرى.';
  const raw = `${error.code} ${error.message}`.toLowerCase();
  if (raw.includes('user_already_exists') || raw.includes('already registered')) return 'يوجد حساب مسجل بهذا البريد بالفعل.';
  if (raw.includes('invalid_credentials') || raw.includes('invalid login credentials')) return 'بيانات الدخول غير صحيحة.';
  if (raw.includes('email_not_confirmed')) return 'أكد بريدك الإلكتروني أولًا ثم سجل الدخول.';
  if (raw.includes('weak_password') || raw.includes('password should be')) return 'كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل.';
  if (raw.includes('rate') || error.status === 429) return 'محاولات كثيرة. حاول مرة أخرى بعد قليل.';
  if (raw.includes('email_address_invalid')) return 'صيغة البريد الإلكتروني غير صحيحة.';
  return error.message === 'AUTH_REQUEST_FAILED' ? 'تعذر إتمام العملية الآن. حاول مرة أخرى.' : error.message;
}
