'use client';

export type ClientSessionUser = {
  localId?: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  emailVerified?: boolean;
  createdAt?: string;
  authProviders?: string[];
  passwordPolicyVersion?: number;
  passwordSecurityUpgradeRecommended?: boolean;
};

type SessionListener = (user: ClientSessionUser | null | undefined) => void;

let cachedUser: ClientSessionUser | null | undefined;
let sessionPromise: Promise<ClientSessionUser | null> | null = null;
let requestGeneration = 0;
let checkedAt = 0;
const PROFILE_HINT_KEY = 'usayrat:profile-visual:v1';
const listeners = new Set<SessionListener>();

// A short-lived visual hint only. It never grants access or stores credentials.
export function readProfileHint(): { displayName: string; avatarUrl: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const hint = JSON.parse(sessionStorage.getItem(PROFILE_HINT_KEY) || 'null');
    if (!hint || typeof hint.expiresAt !== 'number' || !Number.isFinite(hint.expiresAt) || hint.expiresAt < Date.now() || typeof hint.displayName !== 'string' || typeof hint.avatarUrl !== 'string') return null;
    const url = new URL(hint.avatarUrl, window.location.origin);
    if (url.protocol !== 'https:' && url.origin !== window.location.origin) return null;
    return { displayName: hint.displayName, avatarUrl: hint.avatarUrl };
  } catch { return null; }
}

function saveProfileHint() {
  if (typeof window === 'undefined') return;
  try {
    if (cachedUser) sessionStorage.setItem(PROFILE_HINT_KEY, JSON.stringify({
      displayName: cachedUser.displayName, avatarUrl: cachedUser.avatarUrl, expiresAt: Date.now() + 5 * 60_000,
    }));
    else if (cachedUser === null) sessionStorage.removeItem(PROFILE_HINT_KEY);
  } catch { /* Storage may be unavailable; the verified session still works. */ }
}

function emit() {
  saveProfileHint();
  listeners.forEach((listener) => listener(cachedUser));
}

async function loadSession(force = false): Promise<ClientSessionUser | null> {
  if (!force && sessionPromise) return sessionPromise;
  if (!force && cachedUser !== undefined && Date.now() - checkedAt < 60_000) return cachedUser;

  const generation = ++requestGeneration;
  const request = fetch('/api/auth/session', {
    cache: 'no-store',
    credentials: 'same-origin',
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json() as { user?: ClientSessionUser | null };
      return data.user || null;
    })
    .catch(() => null)
    .then((user) => {
      if (generation === requestGeneration) {
        cachedUser = user;
        checkedAt = Date.now();
        emit();
      }
      return generation === requestGeneration ? user : cachedUser ?? null;
    })
    .finally(() => {
      if (sessionPromise === request) sessionPromise = null;
    });

  sessionPromise = request;
  return request;
}

export function ensureClientSession() {
  return loadSession(false);
}

export function refreshClientSession() {
  return loadSession(true);
}

export function setClientSessionUser(user: ClientSessionUser | null) {
  requestGeneration += 1;
  sessionPromise = null;
  cachedUser = user;
  checkedAt = Date.now();
  emit();
}

export function updateClientSessionUser(patch: Partial<ClientSessionUser>) {
  if (!cachedUser) return;
  cachedUser = { ...cachedUser, ...patch };
  emit();
}

export function subscribeClientSession(listener: SessionListener) {
  listeners.add(listener);
  listener(cachedUser);
  return () => listeners.delete(listener);
}
