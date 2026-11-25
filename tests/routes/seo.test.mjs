import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('the security headers ship for every static response', () => {
  const headers = readFileSync('dist/client/_headers', 'utf8');
  for (const header of [
    'Content-Security-Policy: default-src \'self\'; script-src \'self\'; style-src \'self\'',
    'Strict-Transport-Security: max-age=31536000',
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: strict-origin-when-cross-origin',
    'Permissions-Policy: camera=(), microphone=(), geolocation=()'
  ]) {
    assert.ok(headers.includes(header), `missing header: ${header}`);
  }
});

test('no built page carries an inline script without a src', () => {
  function visit(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.name.endsWith('.html')) {
        const html = readFileSync(child, 'utf8');
        assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>[^<]+<\/script>/, `${child}: inline script`);
      }
    }
  }
  visit('dist/client');
});

test('every built page declares its canonical origin', () => {
  const home = readFileSync('dist/client/index.html', 'utf8');
  assert.match(home, /<link rel="canonical" href="https:\/\/vidoxlabs\.com">/);
  const repo = readFileSync('dist/client/repositories/seed/index.html', 'utf8');
  assert.match(repo, /<link rel="canonical" href="https:\/\/vidoxlabs\.com\/repositories\/seed">/);
  assert.match(repo, /<meta property="og:image" content="https:\/\/vidoxlabs\.com\/brand\/seed-banner-dark\.svg">/);
});

test('the sitemap, robots and llms files are generated from the corpus', () => {
  const sitemap = readFileSync('dist/client/sitemap.xml', 'utf8');
  assert.match(sitemap, /<loc>https:\/\/vidoxlabs\.com\/vivarium<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/vidoxlabs\.com\/docs\/seed\/architecture<\/loc>/);
  const robots = readFileSync('dist/client/robots.txt', 'utf8');
  assert.match(robots, /Sitemap: https:\/\/vidoxlabs\.com\/sitemap\.xml/);
  const llms = readFileSync('dist/client/llms.txt', 'utf8');
  assert.match(llms, /# The Vidoxlabs website: Vivarium, its systems, live status and docs\./);
  const full = readFileSync('dist/client/llms-full.txt', 'utf8');
  assert.match(full, /## Documentation corpus/);
  assert.ok(full.length > 50_000, 'the full text covers the corpus');
});

test('the production deploy configuration carries the custom-domain routes', () => {
  const config = JSON.parse(readFileSync('dist/server/wrangler.json', 'utf8'));
  assert.equal(config.workers_dev, false);
  const patterns = config.routes?.map((route) => route.pattern) ?? [];
  for (const pattern of ['vidoxlabs.com', 'www.vidoxlabs.com', 'vidoxlabs.dev', 'www.vidoxlabs.dev']) {
    assert.ok(patterns.includes(pattern), `missing route ${pattern}`);
  }
  assert.ok(existsSync('dist/server/wrangler.json') && config.main === 'host-entry.mjs');
  // The local runtime keeps the routes out so request hosts survive testing.
  if (existsSync('dist/server/wrangler.dev.json')) {
    const devConfig = JSON.parse(readFileSync('dist/server/wrangler.dev.json', 'utf8'));
    assert.ok(!devConfig.routes, 'the local runtime configuration must not carry production routes');
  }
});
