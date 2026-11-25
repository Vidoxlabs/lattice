import { test, expect } from '@playwright/test';

test('the smoke page presents Vivarium as the product', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vidoxlabs builds Vivarium');
  await expect(page.getByRole('link', { name: 'Read the Vivarium source and product brief' })).toBeVisible();
});
