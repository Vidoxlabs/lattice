import { test, expect } from '@playwright/test';

test('the chat page streams a mock answer with citations and tool traces', async ({ page }) => {
  await page.goto('/chat');
  const surface = page.locator('[data-chat-surface="page"]');
  await expect(surface).toBeVisible();
  await page.getByRole('button', { name: 'What is Vivarium?' }).click();
  const reply = page.locator('.lattice-chat-reply');
  await expect(reply).toBeVisible();
  await expect(reply).toContainText(/verified documentation|Vivarium/i);
  await expect(reply).toHaveAttribute('data-turn-state', 'complete');
  const citations = page.locator('.lattice-chat-citations');
  await expect(citations).toBeVisible();
  await expect(page.locator('.lattice-chat-tool').first()).toBeVisible();
  const assistant = page.locator('[data-chat-assistant]').first();
  await expect(assistant).toHaveText('Vidoxlabs assistant');
});

test('the dock opens from any page and keeps the page readable', async ({ page }) => {
  await page.goto('/');
  const launcher = page.locator('[data-chat-launcher]');
  await expect(launcher).toBeVisible();
  await launcher.click();
  const dock = page.locator('[data-chat-surface="dock"]');
  await expect(dock).toBeVisible();
  await expect(page.locator('h1').first()).toBeVisible();
  await page.locator('[data-chat-close]').click();
  await expect(dock).toBeHidden();
});

test('chat answers say so when retrieval finds nothing', async ({ page }) => {
  await page.goto('/chat');
  await page.locator('[data-chat-input]').fill('zqxjkwv nonexistent topic');
  await page.locator('[data-chat-form] button[type="submit"]').click();
  const reply = page.locator('.lattice-chat-reply');
  await expect(reply).toContainText(/could not find that/i);
});
