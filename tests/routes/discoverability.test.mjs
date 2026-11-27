import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { builtRoutes, robotsTxt } from '../../src/lib/discoverability.mjs';
import { siteOrigin } from '../../src/lib/site.mjs';

/**
 * Every built page with its published route.
 * @returns {{ path: string, route: string }[]}
 */
function builtPages() {
  const pages = [];
  const visit = (directory, prefix) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        visit(path, `${prefix}${entry.name}/`);
      } else if (entry.name.endsWith('.html')) {
        pages.push({ path, route: `/${prefix}${entry.name === 'index.html' ? '' : entry.name.replace(/\.html$/, '')}` });
      }
    }
  };
  visit('dist/client', '');
  return pages.sort((a, b) => a.route.localeCompare(b.route));
}

test('every built page declares the canonical URL of its own route', () => {
  const origin = siteOrigin();
  const pages = builtPages();
  assert.ok(pages.length > 100, 'the build must publish the corpus');
  for (const { path, route } of pages) {
    const html = readFileSync(path, 'utf8');
    const declared = html.match(/<link rel="canonical" href="([^"]+)"/g) ?? [];
    assert.equal(declared.length, 1, `${path} must declare exactly one canonical link`);
    const expected = `${origin}${route.replace(/\/+$/, '') || '/'}`;
    assert.ok(html.includes(`<link rel="canonical" href="${expected}">`), `${path} should declare ${expected}`);
  }
});

test('the sitemap lists every built page exactly once', () => {
  const sitemap = readFileSync('dist/client/sitemap.xml', 'utf8');
  const origin = siteOrigin();
  const routes = builtRoutes('dist/client');
  assert.ok(routes.length > 100);
  assert.equal(sitemap.match(/<loc>/g).length, routes.length);
  for (const route of routes) {
    assert.ok(sitemap.includes(`<loc>${origin}${route === '/' ? '/' : route}</loc>`), `missing ${route}`);
  }
  assert.doesNotMatch(sitemap, /\/404<|sitemap\.xml<|robots\.txt</, 'only pages are listed');
});

test('the robots file points at the sitemap and keeps crawlers out of the API', () => {
  const robots = readFileSync('dist/client/robots.txt', 'utf8');
  assert.equal(robots, robotsTxt(siteOrigin()));
  assert.match(robots, /^Disallow: \/api\/$/m);
  assert.ok(!robots.includes('/api/chat'), 'the chat endpoint is covered by the API rule');
});

test('the sitemap and robots file are served as assets, not as pages', () => {
  assert.ok(readFileSync('dist/client/sitemap.xml', 'utf8').startsWith('<?xml'));
  assert.ok(readFileSync('dist/client/robots.txt', 'utf8').startsWith('User-agent:'));
});
