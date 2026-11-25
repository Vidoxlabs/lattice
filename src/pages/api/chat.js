// @ts-ignore The Workers runtime provides this module at deploy time.
import { env } from 'cloudflare:workers';
import { CHAT_LIMITS, originAllowed, validateChatBody } from '../../lib/agent/guards.mjs';
import { RATE_PERIOD_SECONDS, consumeRateSlot } from '../../lib/agent/rate-limit.mjs';
import { runChatTurn } from '../../lib/agent/run.mjs';

export const prerender = false;

const PROVIDER_TIMEOUT_MS = 20_000;

function rateKey(request) {
  return request.headers.get('cf-connecting-ip') ?? 'unknown-client';
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
  const limit = await consumeRateSlot(env, key);
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
