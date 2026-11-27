/**
 * Request guards for the chat endpoint, kept pure for testing.
 */

export const CHAT_LIMITS = Object.freeze({
  MAX_BODY_BYTES: 8_192,
  MAX_MESSAGES: 12,
  MAX_MESSAGE_CHARS: 2_000
});

/**
 * The request origin must be this site unless the operator widened it with
 * CHAT_ALLOWED_ORIGINS. A request without an Origin header (same-origin
 * form posts, curl) is allowed; browsers always send it for cross-site fetch.
 *
 * @param {{ origin: string | null, hostname: string }} request
 * @param {string} allowedOrigins
 * @returns {boolean}
 */
export function originAllowed(request, allowedOrigins) {
  const origin = request.origin;
  if (!origin) return true;
  const allowed = String(allowedOrigins ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (allowed.length) return allowed.includes(origin);
  try {
    return new URL(origin).hostname === request.hostname;
  } catch {
    return false;
  }
}

/**
 * Validate the chat request body shape and size.
 *
 * @param {any} body
 * @returns {{ ok: boolean, error?: string, question?: string }}
 */
export function validateChatBody(body) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (messages.length === 0 || messages.length > CHAT_LIMITS.MAX_MESSAGES) {
    return { ok: false, error: `messages must hold between 1 and ${CHAT_LIMITS.MAX_MESSAGES} turns` };
  }
  const last = messages[messages.length - 1];
  if (!last || typeof last.content !== 'string' || last.content.trim().length === 0) {
    return { ok: false, error: 'the last message needs text' };
  }
  if (messages.some((message) => typeof message?.content === 'string' && message.content.length > CHAT_LIMITS.MAX_MESSAGE_CHARS)) {
    return { ok: false, error: `a message exceeds ${CHAT_LIMITS.MAX_MESSAGE_CHARS} characters` };
  }
  return { ok: true, question: last.content.slice(0, CHAT_LIMITS.MAX_MESSAGE_CHARS) };
}
