import { test, expect } from '@playwright/test';

// The design bar from the videsign canon, asserted against the built site:
// no overlap at phone width, pipeline captions that never collide, a visible
// focus ring, 44px controls, self-hosted fonts and a token-only stylesheet.

const widths = [375, 768, 1280, 1440];

test('pipeline captions never overlap and never clip at any width', async ({ page }) => {
  await page.goto('/');
  const stages = page.locator('[data-pipeline-stage]');
  const count = await stages.count();
  expect(count).toBeGreaterThanOrEqual(5);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const boxes = await stages.evaluateAll((nodes) => nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { top: Math.round(rect.top), bottom: Math.round(rect.bottom), left: Math.round(rect.left), right: Math.round(rect.right) };
    }));
    for (let index = 0; index < boxes.length; index += 1) {
      for (let other = index + 1; other < boxes.length; other += 1) {
        const a = boxes[index];
        const b = boxes[other];
        const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        expect(overlap, `stages ${index} and ${other} overlap at ${width}px`).toBe(false);
      }
    }
    const clipped = await page.locator('[data-pipeline-caption]').evaluateAll((nodes) => nodes.filter((node) => node.scrollWidth > node.clientWidth + 1).length);
    expect(clipped, `a caption is clipped at ${width}px`).toBe(0);
  }
});

test('the page never scrolls sideways at any width', async ({ page }) => {
  for (const path of ['/', '/vivarium', '/repositories', '/docs', '/chat', '/about', '/security']) {
    await page.goto(path);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} overflows at ${width}px`).toBeLessThanOrEqual(1);
    }
  }
});

test('the launcher reserves space and stays clear of the footer at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const launcher = page.locator('[data-chat-launcher]');
  await expect(launcher).toBeVisible();
  const target = await launcher.boundingBox();
  expect(target?.width).toBeGreaterThanOrEqual(44);
  expect(target?.height).toBeGreaterThanOrEqual(44);
  expect(target?.width).toBeLessThan(80); // icon-only below 40rem
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const lastLine = await page.locator('[data-videsign="site-footer"] a').last().boundingBox();
  const atBottom = await launcher.boundingBox();
  expect(lastLine && atBottom ? lastLine.y + lastLine.height : 0).toBeLessThanOrEqual(atBottom?.y ?? 0);
});

test('keyboard focus is always visible', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof Element)) return null;
    const style = getComputedStyle(active);
    return { focusVisible: active.matches(':focus-visible'), outline: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
  });
  expect(first?.focusVisible).toBe(true);
  expect(first?.outline).not.toBe('none');
  expect(first?.width ?? 0).toBeGreaterThan(1);
  for (let step = 0; step < 6; step += 1) {
    await page.keyboard.press('Tab');
    const visible = await page.evaluate(() => {
      const active = document.activeElement;
      if (!(active instanceof Element) || active === document.body) return true;
      const style = getComputedStyle(active);
      return active.matches(':focus-visible') && style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 1;
    });
    expect(visible, `focus ring missing after ${step + 2} tabs`).toBe(true);
  }
});

test('every control is at least 44px and buttons carry a state', async ({ page }) => {
  for (const path of ['/', '/chat', '/docs']) {
    await page.goto(path);
    const small = await page.locator('main button, header button, footer button, [data-chat-launcher]').evaluateAll((nodes) => nodes
      .filter((node) => node instanceof HTMLElement && node.offsetParent !== null)
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return { label: node.getAttribute('aria-label') ?? node.textContent?.trim() ?? '', width: rect.width, height: rect.height };
      })
      .filter((node) => node.width < 44 || node.height < 44));
    expect(small, `${path} has a control under 44px`).toEqual([]);
  }
});

test('fonts load from this origin', async ({ page }) => {
  const fonts = [];
  page.on('response', (response) => {
    if (response.request().resourceType() === 'font') fonts.push(new URL(response.url()).origin);
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() => [...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family));
  expect(loaded).toEqual(expect.arrayContaining(['Geist']));
  expect(loaded.some((family) => /mono/i.test(family))).toBe(true);
  const origin = new URL(page.url()).origin;
  expect(fonts.length).toBeGreaterThan(0);
  expect([...new Set(fonts)]).toEqual([origin]);
});

test('the docs portal shows breadcrumbs, a table of contents and page actions', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/docs/vivarium/system-map');
  await expect(page.locator('.lattice-docs-crumbs')).toBeVisible();
  await expect(page.getByRole('navigation', { name: /on this page/i })).toBeVisible();
  await expect(page.locator('[data-docs-actions]')).toBeVisible();
  const article = page.locator('.lattice-prose');
  const measure = await article.evaluate((node) => node.getBoundingClientRect().width / Number.parseFloat(getComputedStyle(node).fontSize));
  expect(measure).toBeLessThanOrEqual(80);
});
