import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// Runs after the build, so it sees the stylesheet a browser actually loads.
// A token reference that survives bundling without its definition renders as
// nothing at all, which is how the site lost its radius and spacing before.

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

test('every token the built stylesheet references is defined in it', () => {
  const files = filesUnder('dist/client').filter((file) => file.endsWith('.css'));
  assert.ok(files.length > 0, 'The build produced no stylesheet under dist/client.');
  const styles = files.map((file) => readFileSync(file, 'utf8')).join('\n');
  const references = new Set([...styles.matchAll(/var\((--vi-[a-z0-9-]+)\)/g)].map((match) => match[1]));
  assert.ok(references.size > 100, `Only ${references.size} tokens were referenced; the stylesheet looks incomplete.`);
  const missing = [...references].filter((reference) => !styles.includes(`${reference}:`));
  assert.deepEqual(missing, [], 'Built CSS references tokens it never defines.');
});
