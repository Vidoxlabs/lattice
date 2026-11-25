import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// One configuration file holds every budget, and the browser stage enforces it
// in CI. The measured numbers are the decoded payload, the number of responses
// and the longest main-thread block.
const budgets = JSON.parse(readFileSync('tests/browser/budgets.json', 'utf8'));

test.describe.configure({ timeout: 120_000 });

/**
 * Load a page and measure what it costs.
 * @param {import('@playwright/test').Page} page
 * @param {string} route
 */
async function measure(page, route) {
  let bytes = 0;
  let responses = 0;
  const failed = [];
  page.on('response', async (response) => {
    responses += 1;
    if (!response.ok()) failed.push(`${response.status()} ${response.url()}`);
    try {
      bytes += (await response.body()).length;
    } catch {
      // A redirect or a cancelled stream carries no body to measure.
    }
  });
  await page.goto(route, { waitUntil: 'load' });
  const longestTaskMs = await page.evaluate(() => new Promise((resolve) => {
    const observed = [];
    if (typeof PerformanceObserver === 'function') {
      try {
        const observer = new PerformanceObserver((list) => observed.push(...list.getEntries().map((entry) => entry.duration)));
        observer.observe({ entryTypes: ['longtask'] });
      } catch {
        // The engine may not report long tasks; the frame sampling below covers it.
      }
    }
    const gaps = [];
    let last = performance.now();
    let frames = 0;
    const tick = () => {
      const now = performance.now();
      gaps.push(now - last);
      last = now;
      if (++frames < 45) requestAnimationFrame(tick);
      else resolve(Math.round(Math.max(...gaps, ...observed)));
    };
    requestAnimationFrame(tick);
  }));
  return { bytes, requests: responses, longestTaskMs, failed };
}

for (const [route, budget] of Object.entries(budgets.pages)) {
  test(`${route} stays inside its transfer, request and main-thread budget`, async ({ page }) => {
    const measured = await measure(page, route);
    expect(measured.failed, measured.failed.join('\n')).toEqual([]);
    expect(measured.bytes, `${route} payload ${measured.bytes} bytes`).toBeLessThanOrEqual(budget.bytes);
    expect(measured.requests, `${route} made ${measured.requests} requests`).toBeLessThanOrEqual(budget.requests);
    expect(measured.longestTaskMs, `${route} blocked the main thread for ${measured.longestTaskMs}ms`).toBeLessThanOrEqual(budget.longestTaskMs);
  });
}

test('the budget file covers every page type and never drifts from the defaults', () => {
  assertDefaults();
  function assertDefaults() {
    const { defaults, pages } = budgets;
    expect(Object.keys(pages).length).toBeGreaterThanOrEqual(9);
    for (const [route, budget] of Object.entries(pages)) {
      expect(route.startsWith('/'), `${route} must be a site path`).toBe(true);
      expect(budget.bytes).toBeLessThanOrEqual(defaults.bytes);
      expect(budget.requests).toBeLessThanOrEqual(defaults.requests);
      expect(budget.longestTaskMs).toBeLessThanOrEqual(defaults.longestTaskMs);
    }
  }
});
