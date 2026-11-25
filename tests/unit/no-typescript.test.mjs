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

test('browser tests use state-based waits rather than fixed sleeps', () => {
  const forbidden = [
    new RegExp(['waitFor', 'Timeout'].join('')),
    new RegExp(['set', 'Timeout'].join('') + '\\s*\\(')
  ];
  for (const file of filesUnder('tests').filter((path) => /\.mjs$/.test(path))) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of forbidden) assert.doesNotMatch(source, pattern, file);
  }
});
