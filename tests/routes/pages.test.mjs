import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const routes = ['index.html', 'vivarium/index.html', 'repositories/index.html', 'repositories/seed/index.html', 'repositories/bloom/index.html', 'about/index.html', 'security/index.html', 'chat/index.html', 'docs/index.html', '404.html'];

test('every information-architecture route is built', () => {
  for (const route of routes) assert.ok(existsSync(join('dist/client', route)), route);
  assert.ok(existsSync('dist/client/.well-known/security.txt'));
});

test('built pages never call bloom the product or platform', () => {
  function visit(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.name.endsWith('.html')) {
        const html = readFileSync(child, 'utf8');
        assert.doesNotMatch(html, /bloom\s+(?:is|as)\s+(?:the\s+)?(?:product|platform)/i, child);
        assert.doesNotMatch(html, /<title>[^<]*bloom[^<]*(?:product|platform)/i, child);
      }
    }
  }
  visit('dist/client');
});
