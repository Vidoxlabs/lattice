import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

test('the documentation portal builds from the verified corpus', () => {
  assert.ok(existsSync('dist/client/docs/index.html'), 'the docs index is built');
  assert.ok(existsSync('dist/client/docs/seed/architecture/index.html'), 'a synced system page is built');
  const html = readFileSync('dist/client/docs/seed/architecture/index.html', 'utf8');
  assert.match(html, /Document path[\s\S]*<a href="\/repositories\/seed">seed<\/a>/, 'the breadcrumb names the source repository');
  assert.match(html, /rev [0-9a-f]{7}/, 'the header states the revision the page was rendered from');
  assert.match(html, /href="https:\/\/github\.com\/Vidoxlabs\/seed\/blob\/[0-9a-f]{7,40}\//, 'the source link names the repository and revision');
  assert.match(html, /Edit upstream/);
  assert.match(html, /href="\/docs\/seed\/contracts\/run-model"/, 'relative corpus links are rewritten to site routes');
  assert.doesNotMatch(html, /<script(?![^>]*src=)[^>]*>[^<]+<\/script>/, 'no inline scripts in rendered documentation');
});

test('the search index records sources, heads and chunks', () => {
  assert.ok(existsSync('src/data/docs-index.json'), 'run the content build before this check');
  const index = JSON.parse(readFileSync('src/data/docs-index.json', 'utf8'));
  assert.ok(Array.isArray(index.pages) && index.pages.length > 50, 'the index covers the corpus');
  const sample = index.pages.find((page) => page.slug === 'seed/architecture');
  assert.ok(sample, 'a known synced page is indexed');
  assert.equal(sample.repo, 'seed');
  assert.match(String(sample.head), /^[0-9a-f]{40}$/);
  assert.ok(sample.chunks.length > 0 && sample.chunks.every((chunk) => typeof chunk.text === 'string'));
});

test('pages that fail verification render a clear placeholder instead of text', () => {
  const placeholder = 'dist/client/docs/videsign/index.html';
  if (!existsSync(placeholder)) return;
  const html = readFileSync(placeholder, 'utf8');
  assert.match(html, /failed verification at build time/);
  assert.match(html, /github\.com\/Vidoxlabs\/videsign\/blob\//);
});
