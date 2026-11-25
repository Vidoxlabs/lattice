import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// The corpus carries a group word this site does not publish, so the content
// pipeline maps it in one place (src/lib/content/neutral-vocabulary.mjs) before
// anything is rendered. This check is the built-output side of that promise:
// no published file, on either the asset side or the server side the chat
// grounds on, carries the word or the clause the pipeline drops.

const TEXT_SUFFIX = /\.(?:html|js|mjs|css|json|txt|svg|xml|webmanifest)$/;

/**
 * Every text file under a directory, recursively.
 * @param {string} directory
 * @returns {string[]}
 */
function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (TEXT_SUFFIX.test(entry.name)) files.push(path);
  }
  return files;
}

test('the built output carries neither the mapped word nor the persona clause', () => {
  assert.ok(statSync('dist/client').isDirectory(), 'the build output is required for this check');
  const files = [...walk('dist/client'), ...walk('dist/server')];
  const failures = [];
  for (const path of files) {
    const text = readFileSync(path, 'utf8');
    if (/\bsiblings?\b/i.test(text) || text.includes('mirroring five flower-named personas')) failures.push(path);
  }
  assert.deepEqual(failures, []);
});
