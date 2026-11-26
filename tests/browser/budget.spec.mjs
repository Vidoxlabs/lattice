import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// One configuration file holds every budget, and the browser stage enforces it
// in CI. The measured numbers are the decoded payload, the number of responses
// and how many main-thread tasks went over 50 ms; the longest single block is
// reported alongside them.
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
  const bodies = [];
  page.on('response', (response) => {
    responses += 1;
    if (!response.ok()) failed.push(`${response.status()} ${response.url()}`);
    bodies.push(response.body().then((body) => body.length).catch(() => 0));
  });
  await page.goto(route, { waitUntil: 'load' });
  // Read every body before counting, and let fonts and late islands finish, so
  // the total is the same on a fast laptop and a shared runner.
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  bytes = (await Promise.all(bodies)).reduce((sum, size) => sum + size, 0);
  // The observer counts tasks over 50 ms for the load plus a settle window. The
  // frame sampling is the fallback for an engine that reports no long tasks, and
  // it also gives the ceiling something to compare against.
  const { longTasks, longestTaskMs } = await page.evaluate(() => new Promise((resolve) => {
    const observed = [];
    if (typeof PerformanceObserver === 'function') {
      try {
        const observer = new PerformanceObserver((list) => observed.push(...list.getEntries().map((entry) => entry.duration)));
        observer.observe({ entryTypes: ['longtask'] });
      } catch {
        // The engine may not report long tasks; the frame sampling covers it.
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
      else resolve({ longTasks: observed.length, longestTaskMs: Math.round(Math.max(...gaps, ...observed)) });
    };
    requestAnimationFrame(tick);
  }));
  return { bytes, requests: responses, longTasks, longestTaskMs, failed };
}

for (const [route, budget] of Object.entries(budgets.pages)) {
  test(`${route} stays inside its transfer, request and main-thread budget`, async ({ page }) => {
    const measured = await measure(page, route);
    console.log(`${route}: ${measured.bytes} bytes, ${measured.requests} requests, ${measured.longTasks} long tasks`);
    expect(measured.failed, measured.failed.join('\n')).toEqual([]);
    expect(measured.bytes, `${route} payload ${measured.bytes} bytes`).toBeLessThanOrEqual(budget.bytes);
    expect(measured.requests, `${route} made ${measured.requests} requests`).toBeLessThanOrEqual(budget.requests);
    // The longest block is reported, not enforced: see the note in the budget file.
    expect(measured.longTasks, `${route} had ${measured.longTasks} main-thread tasks over 50 ms (longest ${measured.longestTaskMs} ms)`).toBeLessThanOrEqual(budget.longTasks);
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
      expect(budget.longTasks).toBeLessThanOrEqual(defaults.longTasks);
    }
  }
});
