import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { HSTS_HEADER, securityHeaders, headersFileBody } from '../../src/lib/security-headers.mjs';
import { collectStyleHashes, styleBlocks } from '../../src/lib/csp-hashes.mjs';

const styleHashes = collectStyleHashes('dist/client');

/**
 * Every built page, as a route and as a path.
 * @returns {string[]}
 */
function builtPages() {
  const pages = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.name.endsWith('.html')) pages.push(path);
    }
  };
  visit('dist/client');
  return pages.sort();
}

test('no built page carries an inline script without a source', () => {
  const pages = builtPages();
  assert.ok(pages.length > 100, 'the build must produce the documentation pages');
  for (const path of pages) {
    const html = readFileSync(path, 'utf8');
    for (const tag of html.match(/<script\b[^>]*>/gi) ?? []) {
      assert.match(tag, /\bsrc=/i, `${path}: inline script ${tag}`);
    }
  }
});

test('no built page carries an inline style attribute or style element', () => {
  for (const path of builtPages()) {
    const html = readFileSync(path, 'utf8');
    assert.doesNotMatch(html, /\sstyle\s*=/i, `${path} still carries an inline style attribute`);
    assert.doesNotMatch(html, /<style\b/i, `${path} still carries a style element`);
    assert.doesNotMatch(html, /<[^>]+\son[a-z]+\s*=/i, `${path} still carries an inline event handler`);
  }
});

test('the generated asset header file carries the shared policy and no host-only header', () => {
  const headers = readFileSync('dist/client/_headers', 'utf8');
  assert.equal(headers.split('\n').filter((line) => line.startsWith('/*')).length, 1, 'one catch-all rule');
  for (const [name, value] of securityHeaders(styleHashes)) {
    assert.ok(headers.includes(`  ${name}: ${value}`), `missing header: ${name}`);
  }
  assert.equal(headers.includes(`${HSTS_HEADER[0]}:`), false, 'transport security is host-conditional and belongs to the Worker');
  assert.match(headers, /Content-Security-Policy: [^\n]*default-src 'self'/);
  assert.doesNotMatch(headers, /unsafe-inline|unsafe-eval/, 'the policy grants no unsafe source');
  assert.match(headers, /frame-ancestors 'none'/);
  assert.match(headers, /base-uri 'none'/);
  assert.match(headers, /form-action 'self'/);
  assert.match(headers, /\/_astro\/\*/, 'the framework cache rule is preserved');
});

test('the generated header file matches the shared definition exactly', () => {
  const headers = readFileSync('dist/client/_headers', 'utf8');
  assert.ok(headers.startsWith(headersFileBody(styleHashes)), 'the policy block is generated, not hand-written');
});

test('every inline style block is hash-listed from the file the build ships', () => {
  const shipped = readFileSync('dist/client/videsign/vi-orbital-field.js', 'utf8');
  assert.equal(styleBlocks(shipped).length, 1, 'the hero component is the only inline style block');
  assert.equal(styleHashes.length, 1);
  const policy = securityHeaders(styleHashes)[0][1];
  assert.ok(policy.includes(`style-src 'self' ${styleHashes[0]}`), 'the block is granted by hash, not by unsafe-inline');
  assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval/);
  // The Worker applies the same list, so a static page and a dynamic response
  // cannot disagree about which block is allowed.
  assert.ok(readFileSync('dist/server/csp-hashes.mjs', 'utf8').includes(styleHashes[0]));
  assert.ok(readFileSync('dist/server/security-headers.mjs', 'utf8').includes('export function headersForHost'));
});

test('an escaped style block stops the build rather than shipping a wrong hash', () => {
  const directory = mkdtempSync(join(tmpdir(), 'csp-hashes-'));
  writeFileSync(join(directory, 'component.js'), ['const template = `<style>', '.a { content: "\\2014"; }', '</style>`;'].join('\n'));
  assert.throws(() => collectStyleHashes(directory), /escape/);
});
