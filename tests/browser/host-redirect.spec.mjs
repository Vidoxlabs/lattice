import { existsSync, readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// The canonical-host redirect needs a Worker script: the framework serves
// matched static assets without running page middleware, so the check runs in
// a generated Worker entry ahead of it. An assets-only build (every route
// prerendered, no Worker script) cannot redirect; the first non-prerendered
// route ships the Worker and this test stops skipping.
const workerDeploy = existsSync('dist/server/wrangler.json') && JSON.parse(readFileSync('dist/server/wrangler.json', 'utf8')).main === 'host-entry.mjs';

test.describe('canonical host redirect', () => {
  test.skip(!workerDeploy, 'assets-only deploy has no Worker script yet');

  test('every alternate public host is redirected to the canonical home', async ({ request }) => {
    for (const host of ['www.vidoxlabs.com', 'vidoxlabs.dev', 'www.vidoxlabs.dev']) {
      const alternate = await request.get('/', { headers: { Host: host }, maxRedirects: 0 });
      expect(alternate.status(), host).toBe(301);
      expect(alternate.headers().location, host).toBe('https://vidoxlabs.com/');
    }
  });

  test('a deep link keeps its path and drops the query string', async ({ request }) => {
    const alternate = await request.get('/vivarium?from=share', { headers: { Host: 'vidoxlabs.dev' }, maxRedirects: 0 });
    expect(alternate.status()).toBe(301);
    expect(alternate.headers().location).toBe('https://vidoxlabs.com/vivarium');
  });

  test('the canonical host is served without a redirect', async ({ request }) => {
    const canonical = await request.get('/', { headers: { Host: 'vidoxlabs.com' } });
    expect(canonical.status()).toBe(200);
  });
});
