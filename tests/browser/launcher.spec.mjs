import { test, expect } from '@playwright/test';

// At phone widths the launcher is a fixed button over the page. Scrolled to
// the bottom, it must not sit on top of any footer link. Both boxes are read
// in one layout pass, after the scroll has settled, so engines that shift
// layout late (web fonts, islands) cannot skew one box against the other.
const pages = ['/', '/about', '/vivarium', '/repositories', '/repositories/seed', '/docs', '/docs/seed/architecture', '/security', '/this-page-does-not-exist'];

for (const path of pages) {
  test(`the ask launcher clears every footer link on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(path);
    await page.evaluate(async () => {
      await document.fonts.ready;
      // The page scrolls smoothly, so an animated programmatic scroll can still
      // be mid-flight frames later and the boxes would be read against a moving
      // page. Jump instantly, then let two frames settle the layout.
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const result = await page.evaluate(() => {
      const launcher = document.querySelector('[data-chat-launcher]');
      if (!launcher) return { covered: [], links: 0 };
      const box = launcher.getBoundingClientRect();
      const covered = [];
      let links = 0;
      for (const link of document.querySelectorAll('footer a, [class*="footer"] a')) {
        const target = link.getBoundingClientRect();
        if (target.width === 0 || target.height === 0) continue;
        links += 1;
        const across = Math.min(box.right, target.right) - Math.max(box.left, target.left);
        const down = Math.min(box.bottom, target.bottom) - Math.max(box.top, target.top);
        // Half a pixel of tolerance: a sub-pixel kiss is not a covering.
        if (across > 0.5 && down > 0.5) covered.push(link.textContent.trim());
      }
      return { covered, links };
    });
    expect(result.links, 'the page has footer links to check').toBeGreaterThan(0);
    const settledAtBottom = await page.evaluate(
      () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1
    );
    expect(settledAtBottom, 'the page rests at its bottom before the boxes are read').toBe(true);
    const launcher = page.locator('[data-chat-launcher]');
    await expect(launcher).toBeVisible();
    expect(result.covered, `the launcher covers the footer link(s): ${result.covered.join(', ')}`).toEqual([]);
  });
}
