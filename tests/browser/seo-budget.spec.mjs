import { test, expect } from '@playwright/test';

const CSP = /default-src 'self'; script-src 'self'/;

test('every response carries the content security policy and transport headers', async ({ request }) => {
  const page = await request.get('/');
  expect(page.status()).toBe(200);
  expect(page.headers()['content-security-policy']).toMatch(CSP);
  expect(page.headers()['strict-transport-security']).toContain('max-age=31536000');
  expect(page.headers()['x-content-type-options']).toBe('nosniff');

  const status = await request.get('/api/status');
  expect(status.status()).toBe(200);
  expect(status.headers()['content-security-policy']).toMatch(CSP);
  expect(status.headers()['x-content-type-options']).toBe('nosniff');
});

test('the home page ships no inline script elements', async ({ page }) => {
  await page.goto('/');
  const inline = await page.evaluate(() => [...document.querySelectorAll('script')].filter((script) => !script.getAttribute('src')).length);
  expect(inline).toBe(0);
});

test('the home page stays inside its weight and origin budget', async ({ page }) => {
  const seen = [];
  page.on('response', (response) => seen.push(response));
  await page.goto('/');
  const requests = page.context().request;
  void requests;
  let bytes = 0;
  for (const response of seen) {
    const origin = new URL(response.url()).origin;
    expect(origin).toBe(new URL(page.url()).origin);
    const body = await response.body().catch(() => null);
    if (body) bytes += body.length;
  }
  const scripts = seen.filter((response) => new URL(response.url()).pathname.startsWith('/_astro/') && response.url().endsWith('.js'));
  expect(bytes).toBeLessThan(600_000);
  expect(scripts.length).toBeLessThanOrEqual(6);
  expect(seen.filter((response) => !response.ok()).length).toBe(0);
});
