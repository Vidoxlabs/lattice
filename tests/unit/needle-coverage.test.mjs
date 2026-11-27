import assert from 'node:assert/strict';
import test from 'node:test';
import { scanPaths } from '../../scripts/scrub-lib.mjs';

test('synced design artifacts pass the full public-safety scan with no exemptions', () => {
  // scripts/scrub-lib.mjs applies the same pattern and hashed-needle rules to
  // every file. The synced videsign artifacts must pass them unmodified: any
  // private token that survives the publish filter fails here.
  const { failures } = scanPaths(['src/styles/videsign', 'public/brand']);
  assert.deepEqual(failures, []);
});
