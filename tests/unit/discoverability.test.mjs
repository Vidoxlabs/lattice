import assert from 'node:assert/strict';
import test from 'node:test';
import { builtRoutes, robotsTxt, sitemapXml } from '../../src/lib/discoverability.mjs';
import { canonicalUrl, publicPath, siteOrigin } from '../../src/lib/site.mjs';

test('a page path becomes one canonical form', () => {
  assert.equal(publicPath('/'), '/');
  assert.equal(publicPath(''), '/');
  assert.equal(publicPath('/docs/seed/architecture/'), '/docs/seed/architecture');
  assert.equal(publicPath('docs//seed'), '/docs/seed');
  assert.equal(canonicalUrl('/docs/seed/architecture/'), 'https://vidoxlabs.com/docs/seed/architecture');
  assert.equal(canonicalUrl('/'), 'https://vidoxlabs.com/');
});

test('the public origin follows SITE_ORIGIN and drops a trailing slash', () => {
  const original = process.env.SITE_ORIGIN;
  try {
    process.env.SITE_ORIGIN = 'https://example.test/';
    assert.equal(siteOrigin(), 'https://example.test');
    process.env.SITE_ORIGIN = 'https://example.test';
    assert.equal(canonicalUrl('/vivarium'), 'https://example.test/vivarium');
  } finally {
    if (original === undefined) delete process.env.SITE_ORIGIN;
    else process.env.SITE_ORIGIN = original;
  }
});

test('the sitemap lists every route once and never a non-page', () => {
  const xml = sitemapXml(['/', '/about', '/docs/seed/architecture'], 'https://example.test');
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.equal(xml.match(/<url>/g).length, 3);
  assert.match(xml, /<loc>https:\/\/example\.test\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/example\.test\/docs\/seed\/architecture<\/loc>/);
  assert.doesNotMatch(xml, /undefined|null/, 'no unresolved value reaches the sitemap');
  assert.equal(xml.match(/<loc>[^<]*<\/loc>/g).filter((entry) => !entry.startsWith('<loc>https://')).length, 0, 'every entry is absolute');
});

test('the robots file sends crawlers to the sitemap and away from the API', () => {
  const robots = robotsTxt('https://example.test');
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Disallow: \/api\/$/m);
  assert.match(robots, /^Sitemap: https:\/\/example\.test\/sitemap\.xml$/m);
});
