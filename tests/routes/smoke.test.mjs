import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

test('the build emits the smoke page and a deploy configuration', () => {
  assert.ok(existsSync('dist/client/index.html'));
  assert.ok(existsSync('dist/server/wrangler.json') || existsSync('dist/client/wrangler.json'), 'No deploy configuration was generated.');
});
