import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// The corpus carries a group word this site does not publish in prose, so the
// content pipeline maps it in one place (src/lib/content/neutral-vocabulary.mjs)
// before anything is rendered. This check is the built-output side of that
// promise: no published file, on either the asset side or the server side the
// chat grounds on, carries the word or the clause outside code. Code blocks,
// inline code and the markup that renders them are the upstream's own names and
// are stripped before the check looks.

const TEXT_SUFFIX = /\.(?:html|js|mjs|css|json|txt|svg|xml|webmanifest)$/;

/**
 * Strip code and the markup that renders it, leaving prose only.
 * @param {string} text
 * @returns {string}
 */
function proseOnly(text) {
  return text
    .replace(/```[\s\S]*?(?:```|$)/g, ' ')
    .replace(/~~~[\s\S]*?(?:~~~|$)/g, ' ')
    .replace(/<pre\b[\s\S]*?<\/pre>/gi, ' ')
    .replace(/<code\b[\s\S]*?<\/code>/gi, ' ')
    .replace(/`[^`\n]*`/g, ' ');
}

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

test('the built output carries neither the mapped word nor the persona clause outside code', () => {
  assert.ok(statSync('dist/client').isDirectory(), 'the build output is required for this check');
  const files = [...walk('dist/client')];
  const failures = [];
  for (const path of files) {
    const text = proseOnly(readFileSync(path, 'utf8'));
    if (/\bsiblings?\b/i.test(text) || text.includes('mirroring five flower-named personas')) failures.push(path);
  }
  assert.deepEqual(failures, []);
});
