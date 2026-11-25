import { test, expect } from '@playwright/test';

test('live status responds and refreshes repository islands without layout changes', async ({ page }) => {
  // The refresh script fires its first request during page load, so the wait
  // is registered before navigation rather than after it.
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
});
