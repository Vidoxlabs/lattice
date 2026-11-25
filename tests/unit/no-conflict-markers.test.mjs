import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';

// A merge left unresolved would otherwise pass every other check: the marker
// lines are ordinary text to a Markdown renderer and to the build. The pattern
// is assembled from repeated characters rather than written out, so this file
// cannot match itself.
const MARKER = new RegExp(`^(?:${'<'.repeat(7)}|${'='.repeat(7)}|${'>'.repeat(7)})`);
const BINARY_EXTENSIONS = /\.(?:png|jpe?g|gif|ico|webp|avif|woff2?|ttf|otf|pdf|zip|gz|mp4|webm)$/i;

/**
 * Every file git would publish, relative to the repository root.
 * @returns {string[]}
 */
function trackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' });
  return output.split('\0').filter(Boolean).sort();
}

test('no tracked text file carries an unresolved merge-conflict marker', () => {
  const files = trackedFiles();
  assert.ok(files.length > 100, 'the repository listing must be the tracked tree, not a subset');
  const offenders = [];
  for (const file of files) {
    if (BINARY_EXTENSIONS.test(file)) continue;
    const info = statSync(file, { throwIfNoEntry: false });
    if (!info || !info.isFile() || info.size > 2_000_000) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (MARKER.test(line)) offenders.push(`${file}:${index + 1}`);
    });
  }
  assert.deepEqual(offenders, [], `unresolved conflict markers: ${offenders.join(', ')}`);
});
