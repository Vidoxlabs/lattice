import { test, expect } from '@playwright/test';

// Visual checks assert structure and token-driven styling, not pixel
// baselines: the diagrams are generated from live upstream data, so any
// baseline would break on every sync. Both themes are exercised by
// resolving the same token classes under each theme.

test('the home page renders the family stack and the pipeline stepper from live data', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-videsign="family-stack-diagram"]')).toBeVisible();
  const stackNodes = page.locator('[data-vi-family-stack] [data-stack-repo]');
  expect(await stackNodes.count()).toBe(11);
  const stepper = page.locator('[data-videsign="multi-step-stepper"]');
  await expect(stepper).toBeVisible();
  expect(await stepper.locator('[data-pipeline-stage]').count()).toBeGreaterThanOrEqual(5);
  // The diagram is HTML now, so the table is the alternate reading, not the source.
  await stepper.getByText('Read the pipeline as a table').click();
  await expect(stepper.locator('table tbody tr').first()).toBeVisible();
});

test('the family stack ledger updates politely on focus', async ({ page }) => {
  await page.goto('/');
  const ledger = page.locator('[data-family-stack-ledger]');
  await page.locator('[data-stack-repo="seed"]').focus();
  await expect(ledger).toContainText('seed:');
});

test('the Vivarium system map and its text equivalent read the same data', async ({ page }) => {
  await page.goto('/vivarium');
  const table = page.locator('table.lattice-table');
  await expect(table.locator('tbody tr')).toHaveCount(7);
  await page.getByText('Show the system map as a diagram').click();
  const map = page.locator('.diagram-svg[aria-labelledby^="vivarium-system-map"]');
  await expect(map).toBeVisible();
  expect(await map.locator('.diagram-node').count()).toBe(7);
});

test('diagrams style through tokens in both themes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/vivarium');
  await page.getByText('Show the system map as a diagram').click();
  const node = page.locator('.diagram-node-box').first();
  const dark = await node.evaluate((element) => getComputedStyle(element).fill);
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const light = await node.evaluate((element) => getComputedStyle(element).fill);
  expect(dark).not.toBe(light);
});

test('repository pages carry the activity timeline and freshness', async ({ page }) => {
  await page.goto('/repositories/seed');
  await page.getByText('Show the timeline diagram').click();
  await expect(page.locator('.diagram-svg[aria-labelledby^="activity-seed"]')).toBeVisible();
  await page.goto('/repositories');
  await page.getByText('Show the freshness diagram').click();
  await expect(page.locator('.diagram-svg[aria-labelledby^="docs-freshness"]')).toBeVisible();
});
