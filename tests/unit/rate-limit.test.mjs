import assert from 'node:assert/strict';
import test from 'node:test';
import { RATE_LIMIT, RATE_PERIOD_SECONDS, consumeRateSlot } from '../../src/lib/agent/rate-limit.mjs';

test('with no binding the route falls back to a per-isolate counter', async () => {
  const key = 'unbound-client';
  const start = 1_000_000;
  for (let index = 1; index <= RATE_LIMIT; index += 1) {
    const result = await consumeRateSlot({}, key, start);
    assert.equal(result.allowed, true, `request ${index} is inside the limit`);
    assert.equal(result.limitedBy, 'isolate');
    assert.equal(result.remaining, RATE_LIMIT - index);
  }
  const over = await consumeRateSlot({}, key, start);
  assert.equal(over.allowed, false, 'the request after the limit is refused');
  assert.equal(over.remaining, 0);
  // Another client has its own window.
  assert.equal((await consumeRateSlot({}, 'another-client', start)).allowed, true);
});

test('the per-isolate window resets after its period', async () => {
  const key = 'window-client';
  const start = 2_000_000;
  for (let index = 0; index < RATE_LIMIT; index += 1) await consumeRateSlot({}, key, start);
  assert.equal((await consumeRateSlot({}, key, start)).allowed, false);
  const after = start + RATE_PERIOD_SECONDS * 1_000;
  assert.equal((await consumeRateSlot({}, key, after)).allowed, true);
});

test('a bound limiter decides instead of the counter, and its answer is reported', async () => {
  const calls = [];
  const env = {
    CHAT_RATE_LIMITER: {
      limit: async ({ key }) => {
        calls.push(key);
        return { success: key !== 'blocked-client', remaining: 3 };
      }
    }
  };
  const allowed = await consumeRateSlot(env, 'fine-client');
  assert.deepEqual(allowed, { allowed: true, remaining: 3, limitedBy: 'binding' });
  const blocked = await consumeRateSlot(env, 'blocked-client');
  assert.deepEqual(blocked, { allowed: false, remaining: 3, limitedBy: 'binding' });
  assert.deepEqual(calls, ['fine-client', 'blocked-client'], 'the binding is asked on every request');
});

test('a broken or empty binding falls back instead of failing the request', async () => {
  const throwing = { CHAT_RATE_LIMITER: { limit: async () => { throw new Error('binding unavailable'); } } };
  const fallback = await consumeRateSlot(throwing, 'fallback-client');
  assert.equal(fallback.allowed, true);
  assert.equal(fallback.limitedBy, 'isolate');
  assert.equal((await consumeRateSlot({ CHAT_RATE_LIMITER: {} }, 'empty-binding-client')).limitedBy, 'isolate');
});
