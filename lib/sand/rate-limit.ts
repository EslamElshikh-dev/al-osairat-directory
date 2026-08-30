import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export const SAND_USAGE_COOKIE = 'sand_ai_usage';
export const SAND_DAILY_AI_LIMIT = 12;

type UsagePayload = {
  date: string;
  count: number;
  visitorId: string;
};

export type SandUsageState = UsagePayload & {
  configured: boolean;
};

const burstWindows = new Map<string, { startedAt: number; count: number }>();
let burstChecks = 0;

function utcDate(now: Date) {
  return now.toISOString().slice(0, 10);
}

function signature(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function freshUsage(now: Date, configured: boolean): SandUsageState {
  return { date: utcDate(now), count: 0, visitorId: randomUUID(), configured };
}

export function readSandUsage(cookieValue: string | undefined, secret: string | undefined, now = new Date()) {
  const cleanSecret = secret?.trim();
  if (!cleanSecret || cleanSecret.length < 32) return freshUsage(now, false);
  if (!cookieValue) return freshUsage(now, true);

  try {
    const [encoded, sentSignature] = cookieValue.split('.');
    if (!encoded || !sentSignature || !safeEqual(signature(encoded, cleanSecret), sentSignature)) {
      return freshUsage(now, true);
    }
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<UsagePayload>;
    if (typeof payload.visitorId !== 'string' || !/^[a-f0-9-]{36}$/i.test(payload.visitorId)) {
      return freshUsage(now, true);
    }
    if (payload.date !== utcDate(now)) return freshUsage(now, true);
    const count = Number.isInteger(payload.count) ? Math.max(0, Math.min(Number(payload.count), SAND_DAILY_AI_LIMIT)) : 0;
    return { date: payload.date, count, visitorId: payload.visitorId, configured: true };
  } catch {
    return freshUsage(now, true);
  }
}

export function serializeSandUsage(state: SandUsageState, secret: string) {
  const encoded = Buffer.from(JSON.stringify({
    date: state.date,
    count: state.count,
    visitorId: state.visitorId,
  })).toString('base64url');
  return `${encoded}.${signature(encoded, secret)}`;
}

export function consumeSandAiTurn(state: SandUsageState): SandUsageState {
  return { ...state, count: Math.min(SAND_DAILY_AI_LIMIT, state.count + 1) };
}

export function remainingSandAiTurns(state: SandUsageState) {
  return state.configured ? Math.max(0, SAND_DAILY_AI_LIMIT - state.count) : 0;
}

function ipPrefix(value: string) {
  const ip = value.split(',')[0]?.trim() || 'unknown';
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) return ip.split('.').slice(0, 3).join('.');
  if (ip.includes(':')) return ip.split(':').slice(0, 4).join(':');
  return 'unknown';
}

export function consumeSandBurst(
  state: SandUsageState,
  secret: string,
  forwardedFor: string,
  userAgent: string,
  now = Date.now(),
) {
  const key = signature(`${state.visitorId}:${ipPrefix(forwardedFor)}:${userAgent.slice(0, 120)}`, secret).slice(0, 32);
  const existing = burstWindows.get(key);
  const windowMs = 60_000;
  const limit = 4;

  burstChecks += 1;
  if (burstChecks % 128 === 0) {
    for (const [candidate, value] of burstWindows) {
      if (now - value.startedAt > windowMs * 2) burstWindows.delete(candidate);
    }
  }

  if (!existing || now - existing.startedAt >= windowMs) {
    burstWindows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}
