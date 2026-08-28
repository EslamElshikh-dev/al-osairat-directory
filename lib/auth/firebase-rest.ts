export const AUTH_ID_COOKIE = 'osayrat_auth_id';
export const AUTH_REFRESH_COOKIE = 'osayrat_auth_refresh';

const identityBase = 'https://identitytoolkit.googleapis.com/v1';
const secureTokenBase = 'https://securetoken.googleapis.com/v1';

export type FirebaseUser = {
  localId: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
};

export type FirebaseTokens = {
  idToken: string;
  refreshToken: string;
  expiresIn?: string;
};

export class FirebaseAuthError extends Error {
  code: string;
  status: number;

  constructor(code: string, status = 400) {
    super(code);
    this.name = 'FirebaseAuthError';
    this.code = code;
    this.status = status;
  }
}

function getApiKey() {
  const key = process.env.FIREBASE_WEB_API_KEY?.trim();
  if (!key) throw new FirebaseAuthError('AUTH_NOT_CONFIGURED', 503);
  return key;
}

async function identityRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = getApiKey();
  const response = await fetch(`${identityBase}/${path}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error?.message === 'string' ? data.error.message : 'AUTH_REQUEST_FAILED';
    const code = message.split(' : ')[0].trim();
    throw new FirebaseAuthError(code, response.status);
  }
  return data as T;
}

export async function registerWithEmail(email: string, password: string) {
  return identityRequest<{ localId: string; email: string; idToken: string; refreshToken: string; expiresIn: string }>(
    'accounts:signUp',
    { email, password, returnSecureToken: true },
  );
}

export async function updateDisplayName(idToken: string, displayName: string) {
  return identityRequest<{ localId: string; email: string; displayName?: string; idToken: string; refreshToken?: string; expiresIn?: string }>(
    'accounts:update',
    { idToken, displayName, returnSecureToken: true },
  );
}

export async function loginWithEmail(email: string, password: string) {
  return identityRequest<{ localId: string; email: string; displayName?: string; idToken: string; refreshToken: string; expiresIn: string }>(
    'accounts:signInWithPassword',
    { email, password, returnSecureToken: true },
  );
}

export async function lookupUser(idToken: string): Promise<FirebaseUser> {
  const data = await identityRequest<{ users?: Array<{ localId?: string; email?: string; displayName?: string; emailVerified?: boolean }> }>(
    'accounts:lookup',
    { idToken },
  );
  const user = data.users?.[0];
  if (!user?.localId || !user.email) throw new FirebaseAuthError('USER_NOT_FOUND', 401);
  return {
    localId: user.localId,
    email: user.email,
    displayName: user.displayName?.trim() || 'عضو دليل العسيرات',
    emailVerified: Boolean(user.emailVerified),
  };
}

export async function sendVerificationEmail(idToken: string) {
  return identityRequest('accounts:sendOobCode', { requestType: 'VERIFY_EMAIL', idToken });
}

export async function sendPasswordReset(email: string) {
  return identityRequest('accounts:sendOobCode', { requestType: 'PASSWORD_RESET', email });
}

export async function refreshIdToken(refreshToken: string): Promise<FirebaseTokens> {
  const key = getApiKey();
  const response = await fetch(`${secureTokenBase}/token?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.id_token || !data.refresh_token) {
    throw new FirebaseAuthError(typeof data?.error?.message === 'string' ? data.error.message : 'TOKEN_REFRESH_FAILED', response.status || 401);
  }
  return { idToken: data.id_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
}

export function authErrorMessage(error: unknown) {
  const code = error instanceof FirebaseAuthError ? error.code : 'UNKNOWN';
  const messages: Record<string, string> = {
    AUTH_NOT_CONFIGURED: 'نظام العضويات لم يتم تفعيله بعد.',
    EMAIL_EXISTS: 'يوجد حساب مسجل بهذا البريد بالفعل.',
    INVALID_EMAIL: 'صيغة البريد الإلكتروني غير صحيحة.',
    WEAK_PASSWORD: 'كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل.',
    OPERATION_NOT_ALLOWED: 'تسجيل البريد وكلمة المرور غير مفعّل في Firebase بعد.',
    EMAIL_NOT_FOUND: 'بيانات الدخول غير صحيحة.',
    INVALID_PASSWORD: 'بيانات الدخول غير صحيحة.',
    INVALID_LOGIN_CREDENTIALS: 'بيانات الدخول غير صحيحة.',
    USER_DISABLED: 'تم إيقاف هذا الحساب.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'محاولات كثيرة. حاول مرة أخرى بعد قليل.',
    USER_NOT_FOUND: 'تعذر العثور على الحساب.',
    TOKEN_EXPIRED: 'انتهت الجلسة. سجل الدخول من جديد.',
  };
  return messages[code] || 'تعذر إتمام العملية الآن. حاول مرة أخرى.';
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
