/**
 * Rate limiting for `POST /api/chat`, kept out of the route so both paths can be
 * tested without the Workers runtime.
 *
 * The rate-limit binding is the real limiter: it counts across every isolate and
 * survives a restart. It needs an account-scoped namespace identifier, which a
 * public configuration file cannot carry, so the binding is optional and the
 * route falls back to a best-effort per-isolate counter while it is unbound.
 * Both paths return the same shape, so the endpoint cannot tell them apart.
 */

export const RATE_LIMIT = 10;
export const RATE_PERIOD_SECONDS = 60;

/** @type {Map<string, { count: number, reset: number }>} */
const counters = new Map();

function trim(now) {
  for (const [key, entry] of counters) {
    if (entry.reset <= now) counters.delete(key);
  }
}

/**
 * Consume one slot for a client key.
 *
 * @param {Record<string, any> | undefined} env the Worker environment
 * @param {string} key the client key
 * @param {number} [now] the current time in milliseconds
 * @returns {Promise<{ allowed: boolean, remaining: number | null, limitedBy: 'binding' | 'isolate' }>}
 */
export async function consumeRateSlot(env, key, now = Date.now()) {
  const binding = env?.CHAT_RATE_LIMITER;
  if (binding && typeof binding.limit === 'function') {
    try {
      const result = await binding.limit({ key });
      return { allowed: Boolean(result.success), remaining: result.remaining ?? null, limitedBy: 'binding' };
    } catch {
      // A limiter that cannot answer must not take the endpoint down: fall back
      // to the counter, which is weaker but keeps the site answering.
    }
  }
  trim(now);
  const entry = counters.get(key);
  if (!entry || entry.reset <= now) {
    counters.set(key, { count: 1, reset: now + RATE_PERIOD_SECONDS * 1_000 });
    return { allowed: true, remaining: RATE_LIMIT - 1, limitedBy: 'isolate' };
  }
  if (entry.count >= RATE_LIMIT) return { allowed: false, remaining: 0, limitedBy: 'isolate' };
  entry.count += 1;
  return { allowed: true, remaining: RATE_LIMIT - entry.count, limitedBy: 'isolate' };
}
