import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// The repository page groups docs by the first path segments. A top-level file
// such as README.md used to become its own group and render an empty link text.
test('every docs link on a repository page shows a label', () => {
  const html = readFileSync(join('dist', 'client', 'repositories', 'seed', 'index.html'), 'utf8');
  const links = [...html.matchAll(/<a\b[^>]*href="(\/docs\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g)];
  assert.ok(links.length > 0, 'The built repository page has no docs links to check.');
  const empty = links.filter(([, body]) => body.replace(/<[^>]+>/g, '').trim() === '');
  assert.deepEqual(empty.map(([full]) => full), [], 'A docs link on the repository page has empty text.');
});
