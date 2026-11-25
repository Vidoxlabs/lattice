import { test, expect } from '@playwright/test';

test('the sitemap and robots file are served from the site root', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()['content-type']).toContain('xml');
  expect(await sitemap.text()).toContain('<loc>');

  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(robots.headers()['content-type']).toContain('text/plain');
  const body = await robots.text();
  expect(body).toContain('Sitemap:');
  expect(body).toContain('Disallow: /api/');
});

test('a documentation page declares its canonical URL and appears in the sitemap', async ({ page, request }) => {
  await page.goto('/docs/seed/architecture');
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).toMatch(/^https:\/\/vidoxlabs\.com\/docs\/seed\/architecture$/);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain(`<loc>${canonical}</loc>`);
});
