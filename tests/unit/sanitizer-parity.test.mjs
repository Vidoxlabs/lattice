import assert from 'node:assert/strict';
import test from 'node:test';
import { badgeClaimLines, sanitizeRenderedHtml, wrapTables } from '../../src/lib/content/render-docs.mjs';

// The pass was rewritten from a chain of overlapping regular expressions into a
// single tokenizer, because the chain was flagged by code scanning: a removal
// there can adjoin two kept fragments into a new tag. The expected strings
// below are the outputs the previous implementation produced on these inputs
// (verified against the whole rendered corpus build-for-build), so this file
// pins both the neutralization the rules asked for and byte-identical output
// on the shapes the corpus actually contains.

test('script pairs and self-closing scripts are removed exactly as before', () => {
  assert.equal(sanitizeRenderedHtml('<p>keep</p><script>alert(1)</script><p>after</p>'), '<p>keep</p><p>after</p>');
  assert.equal(sanitizeRenderedHtml('<p>a</p><script src="x"/><p>b</p>'), '<p>a</p><p>b</p>');
  assert.equal(sanitizeRenderedHtml('<SCRIPT>alert(1)</SCRIPT><ScRiPt>alert(2)</sCrIpT>'), '');
});

test('dangerous open and close tags drop while their content is kept', () => {
  assert.equal(
    sanitizeRenderedHtml('<iframe src="x"></iframe><form><input><button>b</button></form><template>t</template><meta charset="utf-8">'),
    'bt'
  );
});

test('event-handler attributes are removed with the same spacing as before', () => {
  assert.equal(sanitizeRenderedHtml('<a onmouseover="x()" href="/x">link</a><div ONCLICK = "go()">d</div>'), '<a href="/x">link</a><div>d</div>');
});

test('style attributes keep only the alignment the stylesheet can select on', () => {
  assert.equal(
    sanitizeRenderedHtml('<table><tr><td style="text-align: left">x</td><td style="color:red">y</td><td style=text-align:center>z</td><td style=\'text-align:right\'>w</td></tr></table>'),
    '<table><tr><td data-align="left">x</td><td>y</td><td>z</td><td data-align="right">w</td></tr></table>'
  );
});

test('the forbidden URL scheme is removed from attributes and prose, case-insensitively', () => {
  assert.equal(
    sanitizeRenderedHtml('<a href="javascript:alert(1)">bad</a><a href="JaVaScRiPt:alert(1)">worse</a><p>javascript: in prose</p>'),
    '<a href="alert(1)">bad</a><a href="alert(1)">worse</a><p> in prose</p>'
  );
});

test('images follow the origin-and-inline policy exactly as before', () => {
  assert.equal(
    sanitizeRenderedHtml('<p><img src="https://example.test/badge.svg" alt="badge"><img src=".github/assets/banner.svg" alt="Banner"><img src="/brand/mark.svg" alt="mark"><img src="data:image/gif;base64,AA" alt="inline"></p>'),
    '<p><a href="https://example.test/badge.svg" rel="noopener">badge</a><img src="/brand/mark.svg" alt="mark"><img src="data:image/gif;base64,AA" alt="inline"></p>'
  );
});

test('text that only looks like markup is left alone', () => {
  assert.equal(sanitizeRenderedHtml('3 < 5 and a < b'), '3 < 5 and a < b');
});

test('an html comment is kept intact: its content is inert, so the pass does not edit inside it', () => {
  // The previous chain stripped attribute-looking text inside comments, which
  // changed inert content without any safety gain. The tokenizer treats a
  // comment as text, so only the forbidden URL scheme would ever be removed.
  assert.equal(sanitizeRenderedHtml('<!-- a comment with onmouseover=x inside --><p>after</p>'), '<!-- a comment with onmouseover=x inside --><p>after</p>');
});

test('a scheme split across a removal cannot reassemble after the pass', () => {
  // The previous chain left "javascript:" here: removing the inner occurrence
  // adjoined the halves. The pass repeats until the output stops changing, so
  // the reassembled scheme is removed as well.
  assert.equal(sanitizeRenderedHtml('javjavascript:ascript:'), '');
});

test('a script tag split across a removal cannot reassemble either', () => {
  // The previous chain reduced this input to the literal string "<script>",
  // a live open tag. The tokenizer parses each tag once and never re-scans
  // what it emits, so the fragments cannot adjoin into a new tag; what remains
  // is the inert form the input carried, with no open script tag.
  const output = sanitizeRenderedHtml('<scr<script>ipt>alert(1)</scr</script>ipt>');
  assert.notEqual(output, '<script>');
  assert.equal(output, '<scr<script>ipt>alert(1)</scr</script>ipt>');
});

test('the pass is idempotent on its own output', () => {
  const dirty = '<p>ok</p><script>alert(1)</script><iframe src="x"></iframe><a onmouseover="x()" href="/x">link</a><a href="javascript:alert(1)">bad</a><table><tr><td style="text-align: left">x</td></tr></table>';
  const once = sanitizeRenderedHtml(dirty);
  assert.equal(sanitizeRenderedHtml(once), once);
});

test('tables are wrapped and claim lines are badged without closing the paragraph early', () => {
  assert.equal(wrapTables('<table><tr><td>x</td></tr></table>'), '<div class="lattice-prose-table"><table><tr><td>x</td></tr></table></div>');
  const badged = badgeClaimLines('<p>Status: <code>implemented</code></p>');
  assert.equal(badged, '<p class="lattice-claim-line">Status: <span class="lattice-claim-badge" data-claim="implemented">implemented</span></p>');
});
