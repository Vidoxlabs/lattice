import { test, expect } from '@playwright/test';

test('the docs portal lists its sections and opens a synced page', async ({ page }) => {
  await page.goto('/docs');
  const nav = page.locator('[data-videsign="docs-sidebar-nav"]');
  await expect(nav).toBeVisible();
  await expect(nav.locator('summary', { hasText: 'Vivarium' })).toBeVisible();
  await nav.locator('summary', { hasText: 'seed' }).click();
  await nav.getByRole('link', { name: 'Seed architecture', exact: true }).click();
  await expect(page.locator('.lattice-docs-article h1').first()).toHaveText('Seed architecture');
  const source = page.locator('[data-docs-source-link]');
  await expect(source).toBeVisible();
  expect(await source.getAttribute('href')).toContain('github.com/Vidoxlabs/seed/blob/');
});

test('rewritten corpus links navigate within the site', async ({ page }) => {
  await page.goto('/docs/seed/architecture');
  const runModel = page.locator('.lattice-docs-prose a', { hasText: 'run model' }).first();
  await runModel.click();
  await expect(page.locator('.lattice-docs-article h1').first()).toHaveText(/run model/i);
  await expect(page).toHaveURL(/\/docs\/seed\/contracts\/run-model/);
});

test('claim-status lines render as labelled badges', async ({ page }) => {
  await page.goto('/docs/seed/architecture');
  const badge = page.locator('.lattice-claim-badge').first();
  await expect(badge).toBeVisible();
  expect(['implemented', 'specified', 'planned', 'observed']).toContain(await badge.getAttribute('data-claim'));
});
