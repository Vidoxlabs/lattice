import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const self = 'tests/unit/no-test-sleeps.test.mjs';

test('tests wait on events and state instead of fixed sleeps', () => {
  const files = filesUnder('tests').filter((file) => /\.(?:mjs|js)$/.test(file) && file !== self);
  assert.ok(files.length > 0, 'No test files found to check.');
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /\bwaitForTimeout\s*\(/, `${file}: waitForTimeout is a fixed sleep; wait on a state assertion or a response instead.`);
    assert.doesNotMatch(source, /\bsetTimeout\s*\(/, `${file}: setTimeout is a fixed delay; wait on a state assertion, a response or a function result instead.`);
  }
});
