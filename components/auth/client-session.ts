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
const listeners = new Set<SessionListener>();

function emit() {
  listeners.forEach((listener) => listener(cachedUser));
}

async function loadSession(force = false): Promise<ClientSessionUser | null> {
  if (!force && cachedUser !== undefined) return cachedUser;
  if (!force && sessionPromise) return sessionPromise;

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
        emit();
      }
      return user;
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
  cachedUser = undefined;
  emit();
  return loadSession(true);
}

export function setClientSessionUser(user: ClientSessionUser | null) {
  requestGeneration += 1;
  cachedUser = user;
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
