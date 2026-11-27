import assert from 'node:assert/strict';
import test from 'node:test';
import { collectHeadings } from '../../src/lib/content/render-docs.mjs';

test('a heading with a numeric apostrophe entity shows it and keeps a clean id', () => {
  const { html, toc } = collectHeadings('<h2>Don&#39;t panic</h2><h2>Go &#x27;round</h2>');
  assert.deepEqual(toc.map((entry) => entry.text), ["Don't panic", "Go 'round"]);
  assert.ok(!toc[0].id.includes('39'), `id kept the decimal entity: ${toc[0].id}`);
  assert.ok(!toc[1].id.includes('x27') && !toc[1].id.includes('27'), `id kept the hex entity: ${toc[1].id}`);
  assert.match(html, /id="dont-panic"/);
  assert.match(html, /id="go-round"/);
});

test('named and decimal apostrophe entities decode the same way', () => {
  const { toc } = collectHeadings('<h2>A &apos;name</h2><h2>B &#39;num</h2>');
  assert.deepEqual(toc.map((entry) => entry.text), ["A 'name", "B 'num"]);
});

test('heading anchors match the style the platform uses for files', () => {
  const one = collectHeadings('<h2>Foo &amp; Bar</h2>');
  assert.equal(one.toc[0].id, 'foo--bar');
  const two = collectHeadings('<h2>Setup</h2><h2>Setup</h2>');
  assert.deepEqual(two.toc.map((entry) => entry.id), ['setup', 'setup-1']);
});
