import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

test('the build emits the smoke page and Worker', () => {
  assert.ok(existsSync('dist/client/index.html'));
  assert.ok(existsSync('dist/client/wrangler.json'));
  const html = readFileSync('dist/client/index.html', 'utf8');
  assert.match(html, /Vidoxlabs builds Vivarium/);
  assert.match(html, /https:\/\/github\.com\/Vidoxlabs\/vivarium/);
});
