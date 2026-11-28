import { test, expect } from '@playwright/test';

test('the well-known security policy answers as plain text', async ({ request }) => {
  const response = await request.get('/.well-known/security.txt');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/plain');
  const body = await response.text();
  expect(body).toContain('Contact: mailto:');
  expect(body).toContain('Policy: https://vidoxlabs.com/security');
});

test('every repository on the security page links to a policy that resolves', async ({ page }) => {
  await page.goto('/security');
  const links = page.locator('a[href*="/security/policy"]');
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
  for (const href of await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')))) {
    expect(href).toMatch(new RegExp('^https://github\\.com/Vidoxlabs/[^/]+/security/policy$'));
  }
  await expect(page.getByText('Repo policy or org default')).toBeVisible();
});
