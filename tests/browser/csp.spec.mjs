import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';

// The sweep visits every built page in one test, which needs more than the
// default per-test budget. A longer timeout is not a sleep: every wait is on a
// navigation, a response or an evaluated result.
test.describe.configure({ timeout: 300_000 });

/**
 * Every built page as a route, so the policy is checked on the real corpus
 * rather than on a hand-picked list.
 * @returns {string[]}
 */
function builtRoutes() {
  const routes = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(path);
      } else if (entry.name.endsWith('.html')) {
        const route = `/${path.slice('dist/client/'.length).replace(/index\.html$/, '').replace(/\.html$/, '')}`;
        routes.push(route);
      }
    }
  };
  visit('dist/client');
  return [...new Set(routes)].sort();
}

// Runs before any page script, so a violation is recorded even if the page
// never finishes booting.
async function recordViolations(page) {
  await page.addInitScript(() => {
    /** @type {any} */
    const scope = window;
    scope.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      scope.__cspViolations.push({ directive: event.violatedDirective, blocked: event.blockedURI, sample: event.sample });
    });
  });
}

test('every built page renders inside the content security policy', async ({ page }) => {
  const routes = builtRoutes();
  expect(routes.length).toBeGreaterThan(100);
  const failures = [];
  for (const route of routes) {
    await recordViolations(page);
    const response = await page.goto(route, { waitUntil: 'load' });
    expect(response.status(), `${route} must serve`).toBeLessThan(400);
    const violations = await page.evaluate(() => /** @type {any} */ (window).__cspViolations ?? []);
    for (const violation of violations) failures.push(`${route}: ${violation.directive} blocked ${violation.blocked}`);
  }
  expect(failures, failures.join('\n')).toEqual([]);
});

test('the policy headers reach static pages, the status API, the chat API and the redirect', async ({ request }) => {
  const policy = /default-src 'self'; script-src 'self'/;
  const page = await request.get('/');
  expect(page.status()).toBe(200);
  expect(page.headers()['content-security-policy']).toMatch(policy);
  expect(page.headers()['x-content-type-options']).toBe('nosniff');
  expect(page.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(page.headers()['cross-origin-opener-policy']).toBe('same-origin');
  expect(page.headers()['permissions-policy']).toContain('camera=()');

  const status = await request.get('/api/status');
  expect(status.status()).toBe(200);
  expect(status.headers()['content-security-policy']).toMatch(policy);

  const chat = await request.post('/api/chat', { data: { messages: [] } });
  expect(chat.headers()['content-security-policy']).toMatch(policy);

  const redirect = await request.get('/', { headers: { Host: 'vidoxlabs.dev' }, maxRedirects: 0 });
  expect(redirect.status()).toBe(301);
  expect(redirect.headers()['content-security-policy']).toMatch(policy);
});

test('transport security is pinned on the canonical host only', async ({ request }) => {
  const canonical = await request.get('/', { headers: { Host: 'vidoxlabs.com' } });
  expect(canonical.headers()['strict-transport-security']).toContain('max-age=31536000');

  const preview = await request.get('/');
  expect(preview.status()).toBe(200);
  expect(preview.headers()['strict-transport-security']).toBeUndefined();
});

test('the policy grants no unsafe source and no framing', async ({ request }) => {
  const policy = (await request.get('/')).headers()['content-security-policy'];
  expect(policy).not.toContain('unsafe-inline');
  expect(policy).not.toContain('unsafe-eval');
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("base-uri 'none'");
  expect(policy).toContain("form-action 'self'");
  expect(policy).toContain("object-src 'none'");
});
