import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { scanPaths } from '../../scripts/scrub-lib.mjs';

test('built output passes the full public-safety scan with no exemptions', () => {
  assert.ok(existsSync('dist/client'), 'The build output is required for this check.');
  const { failures } = scanPaths(['dist/client']);
  assert.deepEqual(failures, []);
});
