// @ts-ignore The Workers runtime provides this module at deploy time.
import { env } from 'cloudflare:workers';
import pipeline from '../../data/generated/build-pipeline.json' with { type: 'json' };
import { refreshLiveFields } from '../../lib/live-status.mjs';

export const prerender = false;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  });
}

export async function GET({ request, locals }) {
  const cache = /** @type {CacheStorage & { default: Cache }} */ (caches).default;
  const cacheKey = new Request(new URL('/api/status', request.url), { headers: { Accept: 'application/json' } });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const live = await refreshLiveFields(pipeline.status, {
    token: env.GITHUB_READ_TOKEN || ''
  });
  const response = json({ ...pipeline.status, live, snapshot: pipeline.snapshot });
  locals.cfContext.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
