import { test, expect } from '@playwright/test';

// At phone widths the launcher is a fixed button over the page. Scrolled to
// the bottom, it must not sit on top of any footer link.
const pages = ['/', '/about', '/vivarium', '/repositories', '/repositories/seed', '/docs', '/docs/seed/architecture', '/security', '/this-page-does-not-exist'];

function overlap(a, b) {
  const across = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const down = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return across * down;
}

for (const path of pages) {
  test(`the ask launcher clears every footer link on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(path);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const launcher = page.locator('[data-chat-launcher]');
    await expect(launcher).toBeVisible();
    const launcherBox = await launcher.boundingBox();
    expect(launcherBox).not.toBeNull();
    const links = page.locator('footer a, [class*="footer"] a');
    const count = await links.count();
    expect(count, 'the page has footer links to check').toBeGreaterThan(0);
    for (let index = 0; index < count; index++) {
      const link = links.nth(index);
      if (!(await link.isVisible())) continue;
      const linkBox = await link.boundingBox();
      if (!linkBox) continue;
      const covered = overlap(launcherBox, linkBox);
      expect(covered, `the launcher covers the footer link "${(await link.textContent())?.trim()}"`).toBe(0);
    }
  });
}
