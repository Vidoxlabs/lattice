import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// The corpus carries a group word this site does not publish in prose, so the
// content pipeline maps it in one place (src/lib/content/neutral-vocabulary.mjs)
// before anything is rendered. This check is the built-output side of that
// promise: no published file — the pages, the language-model files, or the
// server bundle the chat grounds on — carries the word or the clause outside
// code. Code blocks, inline code and the markup that renders them are the
// upstream's own names and are stripped before the check looks.

const TEXT_SUFFIX = /\.(?:html|js|mjs|css|json|txt|svg|xml|webmanifest)$/;

/**
 * Strip code and the markup that renders it, leaving prose only. The server
 * bundle embeds the corpus inside JSON strings, where a newline is the
 * two-character escape rather than a line break, so the escape is normalized
 * first and the code boundaries below are the ones the corpus wrote.
 * @param {string} text
 * @returns {string}
 */
function proseOnly(text) {
  return text
    .replace(/\\n/g, '\n')
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
  assert.ok(statSync('dist/server').isDirectory(), 'the server bundle is required for this check');
  const files = [...walk('dist/client'), ...walk('dist/server')];
  const failures = [];
  for (const path of files) {
    const text = proseOnly(readFileSync(path, 'utf8'));
    if (/\bsiblings?\b/i.test(text) || text.includes('mirroring five flower-named personas')) failures.push(path);
  }
  assert.deepEqual(failures, []);
});
