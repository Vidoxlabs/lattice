import { test, expect } from '@playwright/test';

// Visual checks assert structure and token-driven styling, not pixel
// baselines: the diagrams are generated from live upstream data, so any
// baseline would break on every sync. Both themes are exercised by
// resolving the same token classes under each theme.

test('the home page renders the orbital hero and family stack from live data', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('[data-videsign="vi-orbital-field"]');
  await expect(hero).toBeVisible();
  await expect(page.locator('[data-videsign="family-stack-diagram"]')).toBeVisible();
  const stackNodes = page.locator('[data-vi-family-stack] [data-stack-repo]');
  expect(await stackNodes.count()).toBe(11);
  await expect(page.locator('.diagram-svg[aria-labelledby="lattice-pipeline-title lattice-pipeline-desc"]')).toBeVisible();
});

test('the family stack ledger updates politely on focus', async ({ page }) => {
  await page.goto('/');
  const ledger = page.locator('[data-family-stack-ledger]');
  await page.locator('[data-stack-repo="seed"]').focus();
  await expect(ledger).toContainText('seed:');
});

test('the Vivarium system map and its text equivalent read the same data', async ({ page }) => {
  await page.goto('/vivarium');
  const map = page.locator('.diagram-svg[aria-labelledby^="vivarium-system-map"]');
  await expect(map).toBeVisible();
  expect(await map.locator('.diagram-node').count()).toBe(7);
  const table = page.locator('.lattice-diagram-table table');
  await page.locator('.lattice-diagram-table summary').click();
  await expect(table.locator('tbody tr')).toHaveCount(7);
});

test('diagrams style through tokens in both themes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/vivarium');
  const node = page.locator('.diagram-node-box').first();
  const dark = await node.evaluate((element) => getComputedStyle(element).fill);
  await page.getByRole('button', { name: 'Theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const light = await node.evaluate((element) => getComputedStyle(element).fill);
  expect(dark).not.toBe(light);
});

test('repository pages carry the activity timeline and freshness', async ({ page }) => {
  await page.goto('/repositories/seed');
  const timeline = page.locator('.diagram-svg[aria-labelledby^="activity-seed"]');
  await expect(timeline).toBeVisible();
  await page.goto('/repositories');
  await expect(page.locator('.diagram-svg[aria-labelledby^="docs-freshness"]')).toBeVisible();
});
