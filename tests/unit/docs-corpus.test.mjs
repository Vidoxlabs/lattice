import assert from 'node:assert/strict';
import test from 'node:test';
import { buildResolver, headingsFor, prepare, slugFor, titleFor } from '../../src/lib/content/docs-corpus.mjs';
import { badgeClaimLines, sanitizeRenderedHtml } from '../../src/lib/content/render-docs.mjs';
import { enrichDocsCorpus } from '../../src/lib/content/enrich.mjs';

const corpus = [
  { repo: 'docs', sourcePath: 'docs/index.md', slug: '', kind: 'hub' },
  { repo: 'docs', sourcePath: 'docs/family.md', slug: 'family', kind: 'hub' },
  { repo: 'docs', sourcePath: 'docs/adr/template.md', slug: 'adr/template', kind: 'hub' },
  { repo: 'seed', sourcePath: 'README.md', slug: 'seed', kind: 'source' },
  { repo: 'seed', sourcePath: 'docs/architecture.md', slug: 'seed/architecture', kind: 'source' },
  { repo: 'seed', sourcePath: 'docs/contracts/run-model.md', slug: 'seed/contracts/run-model', kind: 'source' }
];

test('slugs map repository files onto stable site routes', () => {
  assert.equal(slugFor('seed', 'README.md'), 'seed');
  assert.equal(slugFor('seed', 'docs/architecture.md'), 'seed/architecture');
  assert.equal(slugFor('vivarium', 'AGENTS.md'), 'vivarium/agents');
  assert.equal(slugFor('videsign', 'DESIGN.md'), 'videsign/design');
  assert.equal(slugFor('docs', 'index.md'), '');
  assert.equal(slugFor('docs', 'adr/template.md'), 'adr/template');
  assert.equal(slugFor('seed', 'NOTES.md'), null);
});

test('titles and headings derive from the document itself', () => {
  assert.equal(titleFor('# Seed architecture\nbody', 'docs/x.md'), 'Seed architecture');
  assert.equal(titleFor('no heading', 'some-file.md'), 'some file');
  assert.deepEqual(headingsFor('# T\n## A\n### B\n## C'), ['A', 'B', 'C']);
});

test('relative links resolve to site routes inside the corpus and upstream outside it', () => {
  const resolve = buildResolver(corpus);
  const head = 'c'.repeat(40);
  const body = 'See [the run model](contracts/run-model.md), the [missing one](contracts/absent.md), [the seed readme](../README.md) and [the escapee](../../../outside.md).';
  const prepared = prepare(body, { repo: 'seed', head, sourcePath: 'docs/architecture.md', resolve });
  assert.match(prepared, /\[the run model\]\(\/docs\/seed\/contracts\/run-model\)/);
  assert.match(prepared, new RegExp(`\\[missing one\\]\\(https://github\\.com/Vidoxlabs/seed/blob/${head}/docs/contracts/absent\\.md\\)`));
  assert.match(prepared, /\[the seed readme\]\(\/docs\/seed\)/);
  assert.match(prepared, /\[the escapee\]\(https:\/\/github\.com\/Vidoxlabs\/seed\/tree\/cccccccccccccccccccccccccccccccccccccccc\)/);
});

test('hub relative links resolve within the hub and external links stay untouched', () => {
  const resolve = buildResolver(corpus);
  const prepared = prepare('Read [the family](family.md) and [the template](template.md) plus [the site](https://example.invalid/x).', { repo: 'docs', head: 'd'.repeat(40), sourcePath: 'adr/README.md', resolve });
  assert.match(prepared, /\[the family\]\(\/docs\/family\)/);
  assert.match(prepared, /\[the template\]\(\/docs\/adr\/template\)/);
  assert.match(prepared, /\[the site\]\(https:\/\/example\.invalid\/x\)/);
});

test('mermaid fences render as source with a note, never as a live block', () => {
  const resolve = buildResolver(corpus);
  const prepared = prepare('Intro\n\n```mermaid\nflowchart LR\n  A --> B\n```\n', { repo: 'seed', head: 'c'.repeat(40), sourcePath: 'README.md', resolve });
  assert.match(prepared, /lattice-diagram-source/);
  assert.match(prepared, /Diagram source/);
  assert.doesNotMatch(prepared, /```mermaid/);
});

test('rendered documentation html is stripped of interactive markup', () => {
  const dirty = '<p>ok</p><script>alert(1)</script><iframe src="x"></iframe><a onmouseover="x()" href="/x">link</a><a href="javascript:alert(1)">bad</a>';
  const clean = sanitizeRenderedHtml(dirty);
  assert.doesNotMatch(clean, /<script|<iframe|onmouseover|javascript:/);
  assert.match(clean, /<p>ok<\/p>/);
  assert.match(clean, /<a href="\/x">link<\/a>/);
});

test('claim-status lines become badges only for the family vocabulary', () => {
  const html = '<p>Status: <code>implemented</code></p><p>Status: <code>banana</code></p>';
  const badged = badgeClaimLines(html);
  assert.match(badged, /data-claim="implemented"/);
  assert.doesNotMatch(badged, /data-claim="banana"/);
  assert.match(badged, /<code>banana<\/code>/);
});

test('enrichment is a no-op while disabled and while unbudgeted', () => {
  const pages = [{ slug: 'x', body: 'text' }];
  assert.equal(enrichDocsCorpus(pages), pages);
  assert.equal(enrichDocsCorpus(pages, { enabled: true }), pages);
  assert.equal(enrichDocsCorpus(pages, { enabled: true, maxUsd: 0 }), pages);
});
