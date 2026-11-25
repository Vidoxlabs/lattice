// @ts-ignore The Workers runtime provides this module at deploy time.
import { env } from 'cloudflare:workers';
import { CHAT_LIMITS, originAllowed, validateChatBody } from '../../lib/agent/guards.mjs';
import { runChatTurn } from '../../lib/agent/run.mjs';

export const prerender = false;

const PROVIDER_TIMEOUT_MS = 20_000;
const RATE_LIMIT = 10;
const RATE_PERIOD_SECONDS = 60;

/** Best-effort per-isolate limiter for when no rate-limit binding is bound. */
const localLimiter = new Map();

function rateKey(request) {
  return request.headers.get('cf-connecting-ip') ?? 'unknown-client';
}

function trimLocalLimiter(now) {
  for (const [key, entry] of localLimiter) {
    if (entry.reset <= now) localLimiter.delete(key);
  }
}

/**
 * Consume one rate-limit slot for the client. Uses the CHAT_RATE_LIMITER
 * binding when the operator has bound one; otherwise a best-effort
 * per-isolate counter that the binding replaces in production.
 * TODO(family): the Workers rate-limit binding needs an account namespace
 * identifier the public configuration file must not carry; SETUP.md records
 * the owner step. The local counter keeps the guard testable meanwhile.
 */
async function consumeRateSlot(key) {
  if (env.CHAT_RATE_LIMITER && typeof env.CHAT_RATE_LIMITER.limit === 'function') {
    const result = await env.CHAT_RATE_LIMITER.limit({ key });
    return { allowed: result.success, remaining: result.remaining ?? null };
  }
  const now = Date.now();
  trimLocalLimiter(now);
  const entry = localLimiter.get(key);
  if (!entry || entry.reset <= now) {
    localLimiter.set(key, { count: 1, reset: now + RATE_PERIOD_SECONDS * 1_000 });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  if (entry.count >= RATE_LIMIT) return { allowed: false, remaining: 0 };
  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT - entry.count };
}

function event(type, data) {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST({ request }) {
  const url = new URL(request.url);
  if (!originAllowed({ origin: request.headers.get('origin'), hostname: url.hostname }, env.CHAT_ALLOWED_ORIGINS)) {
    return new Response('Origin not allowed', { status: 403 });
  }
  const key = rateKey(request);
  const limit = await consumeRateSlot(key);
  if (!limit.allowed) {
    return new Response('Too many requests', {
      status: 429,
      headers: { 'Retry-After': String(RATE_PERIOD_SECONDS) }
    });
  }
  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > CHAT_LIMITS.MAX_BODY_BYTES) return new Response('Request too large', { status: 413 });
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }
  const validated = validateChatBody(body);
  if (!validated.ok) return new Response(validated.error, { status: 400 });

  const turn = await runChatTurn(validated.question, env);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type, data) => controller.enqueue(encoder.encode(event(type, data)));
      send('session', { assistant: turn.assistant, remaining: limit.remaining });
      if (turn.providerErrors.length) send('notice', { text: turn.providerErrors.join('; ') });
      send('plan', { steps: turn.plan });
      for (const call of turn.toolCalls) send('tool', call);
      send('citations', { sources: turn.citations });
      let generation = null;
      try {
        generation = await Promise.race([
          turn.answer(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('the provider timed out')), PROVIDER_TIMEOUT_MS))
        ]);
      } catch (error) {
        send('error', { text: error instanceof Error ? error.message : 'the answer failed' });
        send('done', { ok: false });
        controller.close();
        return;
      }
      const text = generation?.ok ? generation.generation.text : '';
      const words = text.split(/(\s+)/);
      let buffer = '';
      for (const word of words) {
        buffer += word;
        if (buffer.length >= 24) {
          send('token', { text: buffer });
          buffer = '';
        }
      }
      if (buffer) send('token', { text: buffer });
      send('done', { ok: true });
      controller.close();
    }
  });
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-RateLimit-Remaining': String(limit.remaining ?? '')
    }
  });
}
