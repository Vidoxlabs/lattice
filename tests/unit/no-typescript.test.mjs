import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

test('no TypeScript source appears in source, scripts or tests', () => {
  const files = ['src', 'scripts', 'tests'].flatMap(filesUnder);
  assert.deepEqual(files.filter((file) => /\.tsx?$/.test(file)), []);
});

