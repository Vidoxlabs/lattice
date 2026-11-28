import { test, expect } from '@playwright/test';

test('live status responds and refreshes repository islands without layout changes', async ({ page }) => {
  // The refresh script fires its first request during page load, so the wait
  // is registered before navigation rather than after.
  const statusLoaded = page.waitForResponse((item) => item.url().endsWith('/api/status') && item.status() === 200);
  await page.goto('/repositories');
  const card = page.locator('[data-status-repository="seed"]').first();
  await expect(card).toBeVisible();
  const before = await card.boundingBox();
  const response = await statusLoaded;
  expect((await response.json()).repositories.seed).toBeTruthy();
  await expect(page.locator('html')).toHaveAttribute('data-live-status', /fresh|degraded/);
  const after = await card.boundingBox();
  expect(after).toEqual(before);
  await expect(card.locator('[data-status-source]')).toHaveText(/Build data from .+ ET|Live data, observed .+ ET|Live data unavailable/);
});

test('the status API labels every field with its source and keeps its cache honest', async ({ request }) => {
  const response = await request.get('/api/status');
  expect(response.status()).toBe(200);
  const cache = response.headers()['cache-control'] ?? '';
  expect(cache).toMatch(/^public, max-age=(60|300)$/);
  expect(cache).not.toContain('14400');
  const payload = await response.json();
  const seed = payload.live?.repositories?.seed;
  expect(seed?.sources?.head).toBeTruthy();
  expect(['build', 'live']).toContain(seed.sources.ciConclusion);
  expect(payload.buildAt === null || typeof payload.buildAt).toBe('string');
});
