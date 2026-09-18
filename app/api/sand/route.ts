import { NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '@/lib/auth/supabase-rest';
import { villages } from '@/lib/data';
import { generateSandAiReply, hasConfiguredSandProvider } from '@/lib/sand/agent';
import { getSandDirectoryGrounding, getSandEmergencyGrounding } from '@/lib/sand/grounding';
import { planSandRequest } from '@/lib/sand/intent';
import { directSandReply, sandSuggestions, SAND_DISCLOSURE } from '@/lib/sand/persona';
import {
  SAND_DAILY_AI_LIMIT,
  SAND_USAGE_COOKIE,
  consumeSandAiTurn,
  consumeSandBurst,
  readSandUsage,
  remainingSandAiTurns,
  serializeSandUsage,
} from '@/lib/sand/rate-limit';
import { classifySandMessage, cleanSandText } from '@/lib/sand/safety';
import type { SandApiResponse, SandChatMessage, SandGrounding } from '@/lib/sand/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 25;

function cleanHistory(value: unknown): SandChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-6).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const role = (item as { role?: unknown }).role;
    const text = cleanSandText((item as { text?: unknown }).text, 500);
    return (role === 'user' || role === 'assistant') && text ? [{ role, text }] : [];
  });
}

function jsonResponse(payload: SandApiResponse, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'طلب غير مسموح.' }, { status: 403 });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 16_384) {
    return NextResponse.json({ error: 'حجم الرسالة أكبر من المسموح.' }, { status: 413 });
  }

  const body = await request.json().catch(() => ({}));
  const message = cleanSandText(body?.message, 500);
  const history = cleanHistory(body?.history);
  if (message.length < 2) {
    return NextResponse.json({ error: 'اكتب سؤالك في كلمتين على الأقل.' }, { status: 400 });
  }

  const classification = classifySandMessage(message);
  const plan = planSandRequest(message, history, villages);
  const greetingOnly = classification.greeting && plan.intent !== 'directory';
  let grounding: SandGrounding | undefined;
  let groundingUnavailable = false;

  if (classification.emergency) {
    grounding = getSandEmergencyGrounding();
  } else if (
    !classification.promptInjection
    && !classification.political
    && !greetingOnly
    && !classification.developer
    && plan.intent === 'directory'
    && !plan.clarification
  ) {
    try {
      grounding = await getSandDirectoryGrounding(plan);
    } catch (error) {
      groundingUnavailable = true;
      console.warn('[sand] grounding fallback', {
        errorName: error instanceof Error ? error.name : 'unknown',
        intent: plan.intent,
        category: plan.category || null,
        hasVillage: Boolean(plan.village),
      });
    }
  }

  const secret = process.env.SAND_RATE_LIMIT_SECRET?.trim();
  let usage = readSandUsage(request.cookies.get(SAND_USAGE_COOKIE)?.value, secret);
  let mode: SandApiResponse['mode'] = classification.emergency ? 'emergency' : 'direct';
  let reply = directSandReply(classification, grounding, 'provider_unavailable', plan);
  let directReason: 'daily_limit' | 'burst_limit' | 'provider_unavailable' | 'search_unavailable' = groundingUnavailable
    ? 'search_unavailable'
    : 'provider_unavailable';

  const canConsiderAi = Boolean(
    grounding?.results.length
    && !classification.emergency
    && !classification.promptInjection
    && !classification.political
    && !greetingOnly
    && !classification.developer
    && !classification.medicalAdvice
    && usage.configured
    && secret
    && hasConfiguredSandProvider(),
  );

  if (canConsiderAi && usage.count >= SAND_DAILY_AI_LIMIT) {
    directReason = 'daily_limit';
  } else if (canConsiderAi && secret && !consumeSandBurst(
    usage,
    secret,
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
    request.headers.get('user-agent') || '',
  )) {
    directReason = 'burst_limit';
  } else if (canConsiderAi) {
    const aiController = new AbortController();
    const aiBudgetMs = 7_500;
    const aiTimer = setTimeout(() => aiController.abort(), aiBudgetMs);
    try {
      const aiReply = await generateSandAiReply(message, history, grounding!, plan, {
        abortSignal: aiController.signal,
      });
      if (aiReply) {
        reply = aiReply.text;
        mode = aiReply.mode;
        usage = consumeSandAiTurn(usage);
      }
    } finally {
      clearTimeout(aiTimer);
    }
  }

  if (mode === 'direct') reply = directSandReply(classification, grounding, directReason, plan);

  console.info('[sand] response', {
    intent: plan.intent,
    category: plan.category || null,
    hasVillage: Boolean(plan.village),
    resultCount: grounding?.total ?? 0,
    dataSource: grounding?.source || 'none',
    mode,
    directReason: mode === 'direct' ? directReason : null,
    durationMs: Date.now() - startedAt,
    aiConfigured: hasConfiguredSandProvider(),
    usageConfigured: usage.configured,
  });

  const response = jsonResponse({
    message: reply,
    mode,
    disclosure: SAND_DISCLOSURE,
    results: grounding?.results || [],
    suggestions: sandSuggestions(classification, grounding, plan),
    remainingAiMessages: remainingSandAiTurns(usage),
    dataSource: grounding?.source || 'none',
  });

  if (usage.configured && secret) {
    response.cookies.set(SAND_USAGE_COOKIE, serializeSandUsage(usage, secret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 48,
      priority: 'low',
    });
  }

  return response;
}
