import { test, expect } from '@playwright/test';

test('the smoke page presents Vivarium as the product', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vidoxlabs builds Vivarium');
  await expect(page.getByRole('link', { name: 'Read the Vivarium source and product brief' })).toBeVisible();
  await expect(page.locator('[data-videsign="layout-public-site"]')).toBeVisible();
});

test('theme persists and navigation and motion controls expose state', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const root = page.locator('html');
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Theme' }).click();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Pause background motion' }).click();
  await expect(root).toHaveAttribute('data-motion', 'paused');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('dialog', { name: 'Site navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Site navigation' })).toBeHidden();
});
