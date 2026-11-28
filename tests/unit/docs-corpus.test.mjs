import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { buildResolver, collectDocsCorpus, headingsFor, prepare, slugFor, titleFor } from '../../src/lib/content/docs-corpus.mjs';
import { badgeClaimLines, sanitizeRenderedHtml } from '../../src/lib/content/render-docs.mjs';
import { enrichDocsCorpus } from '../../src/lib/content/enrich.mjs';
import { colourTokenException, needleDigests } from '../../src/lib/content-safety.mjs';

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

test('a hub link to a file the corpus does not publish points at the hub head', () => {
  const resolve = buildResolver(corpus);
  const head = 'd'.repeat(40);
  const prepared = prepare('See [the capabilities](capabilities.json) and [the escapee](../../outside.md).', { repo: 'docs', head, sourcePath: 'timeline/README.md', resolve });
  assert.match(prepared, new RegExp(`\\[the capabilities\\]\\(https://github\\.com/Vidoxlabs/docs/blob/${head}/docs/timeline/capabilities\\.json\\)`));
  assert.match(prepared, new RegExp(`\\[the escapee\\]\\(https://github\\.com/Vidoxlabs/docs/tree/${head}\\)`));
});

test('a badge image inside a link collapses into the link, never nesting anchors', () => {
  const resolve = buildResolver(corpus);
  const prepared = prepare('[![seed tests](https://github.com/Vidoxlabs/seed/actions/workflows/ci.yml/badge.svg)](https://github.com/Vidoxlabs/seed/actions/workflows/ci.yml)', { repo: 'seed', head: 'c'.repeat(40), sourcePath: 'README.md', resolve });
  assert.match(prepared, /^\[seed tests\]\(https:\/\/github\.com\/Vidoxlabs\/seed\/actions\/workflows\/ci\.yml\)$/);
  assert.doesNotMatch(prepared, /!\[/);
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

test('inline styles become selectable attributes and third-party images become links', () => {
  const html = [
    '<table><thead><tr><th style="text-align: left">Module</th><th style="color: red">Raw</th></tr></thead></table>',
    '<p><img src="https://github.com/Vidoxlabs/seed/actions/workflows/ci.yml/badge.svg" alt="seed tests">',
    '<img src=".github/assets/banner.svg" alt="Banner"></p>',
    '<p><img src="/brand/brand_mark_header_v008.svg" alt="mark"><img src="data:image/gif;base64,AA" alt="inline"></p>'
  ].join('');
  const clean = sanitizeRenderedHtml(html);
  assert.doesNotMatch(clean, /style=/i);
  assert.match(clean, /<th data-align="left">Module<\/th>/);
  assert.match(clean, /<a href="https:\/\/github.com\/Vidoxlabs\/seed\/actions\/workflows\/ci.yml\/badge.svg" rel="noopener">seed tests<\/a>/);
  assert.doesNotMatch(clean, /banner\.svg/);
  assert.match(clean, /<img src="\/brand\/brand_mark_header_v008.svg"/);
  assert.match(clean, /<img src="data:image\/gif;base64,AA"/);
});

test('claim-status lines become badges only for the family vocabulary', () => {
  const html = '<p>Status: <code>implemented</code></p><p>Status: <code>banana</code></p>';
  const badged = badgeClaimLines(html);
  assert.match(badged, /data-claim="implemented"/);
  assert.doesNotMatch(badged, /data-claim="banana"/);
  assert.match(badged, /<code>banana<\/code>/);
});

test('a claim badge keeps the rest of its sentence inside the same paragraph', () => {
  const badged = badgeClaimLines('<p>Status: <code>specified</code>. The modules behind it stay specified.</p>');
  assert.equal(
    badged,
    '<p class="lattice-claim-line">Status: <span class="lattice-claim-badge" data-claim="specified">specified</span>. The modules behind it stay specified.</p>'
  );
  assert.equal(badged.match(/<\/p>/g)?.length, 1, 'the paragraph closes exactly once');
});

test('enrichment is a no-op while disabled and while unbudgeted', () => {
  const pages = [{ slug: 'x', body: 'text' }];
  assert.equal(enrichDocsCorpus(pages), pages);
  assert.equal(enrichDocsCorpus(pages, { enabled: true }), pages);
  assert.equal(enrichDocsCorpus(pages, { enabled: true, maxUsd: 0 }), pages);
});

test('a verified page is published with the neutral mapping, title and headings included', async () => {
  const raw = '# Sibling sync\n\nThe queue drains sibling jobs, mirroring five flower-named personas.\n\n## Sibling queues\n';
  const sha256 = createHash('sha256').update(raw).digest('hex');
  const manifest = { sources: { seed: { name: 'seed', head: 'a'.repeat(40), files: [{ path: 'README.md', sha256 }] } } };
  const fetchImpl = async (url) => {
    if (url.includes('sources/seed/README.md')) return { ok: true, status: 200, headers: { get: () => null }, text: async () => raw, json: async () => ({}) };
    if (url.includes('/git/trees/')) return { ok: true, status: 200, headers: { get: () => null }, text: async () => '', json: async () => ({ sha: 'b'.repeat(40), tree: [] }) };
    return { ok: false, status: 404, headers: { get: () => null }, text: async () => '', json: async () => ({}) };
  };
  const pages = await collectDocsCorpus(fetchImpl, manifest, '', []);
  const page = pages.find((entry) => entry.slug === 'seed');
  assert.equal(page.kind, 'source');
  assert.equal(page.title, 'Peer sync');
  assert.match(page.body, /# Peer sync/);
  assert.match(page.body, /drains peer jobs\./);
  assert.doesNotMatch(page.body, /sibling|personas/);
  assert.deepEqual(page.headings, ['Peer queues']);
});

test('the mapping runs after verification: a digest mismatch still renders a placeholder', async () => {
  const raw = '# Peer sync\n\nsibling\n';
  const manifest = { sources: { seed: { name: 'seed', head: 'a'.repeat(40), files: [{ path: 'README.md', sha256: 'f'.repeat(64) }] } } };
  const fetchImpl = async (url) => {
    if (url.includes('sources/seed/README.md')) return { ok: true, status: 200, headers: { get: () => null }, text: async () => raw, json: async () => ({}) };
    if (url.includes('/git/trees/')) return { ok: true, status: 200, headers: { get: () => null }, text: async () => '', json: async () => ({ sha: 'b'.repeat(40), tree: [] }) };
    return { ok: false, status: 404, headers: { get: () => null }, text: async () => '', json: async () => ({}) };
  };
  const pages = await collectDocsCorpus(fetchImpl, manifest, '', []);
  assert.equal(pages.find((entry) => entry.slug === 'seed').kind, 'placeholder');
});

test('an exempt colour token publishes the videsign readme and blocks the same text elsewhere', async () => {
  // The real palette tokens cannot be spelled in this repository, so the
  // scoped exception is exercised with a synthetic digest registered in the
  // same sets the content check consults.
  const synthetic = createHash('sha256').update('syntheticexceptiontoken').digest('hex');
  needleDigests.add(synthetic);
  colourTokenException.add(synthetic);
  try {
    const raw = '# Palette\n\nThe ramp lists syntheticexceptiontoken as an accent.\n';
    const sha256 = createHash('sha256').update(raw).digest('hex');
    const manifest = {
      sources: {
        videsign: { name: 'videsign', head: 'a'.repeat(40), files: [{ path: 'README.md', sha256 }] },
        seed: { name: 'seed', head: 'a'.repeat(40), files: [{ path: 'README.md', sha256 }] }
      }
    };
    const fetchImpl = async (url) => {
      if (url.includes('/README.md')) return { ok: true, status: 200, headers: { get: () => null }, text: async () => raw, json: async () => ({}) };
      if (url.includes('/git/trees/')) return { ok: true, status: 200, headers: { get: () => null }, text: async () => '', json: async () => ({ sha: 'b'.repeat(40), tree: [] }) };
      return { ok: false, status: 404, headers: { get: () => null }, text: async () => '', json: async () => ({}) };
    };
    const pages = await collectDocsCorpus(fetchImpl, manifest, '', []);
    assert.equal(pages.find((entry) => entry.slug === 'videsign').kind, 'source');
    assert.equal(pages.find((entry) => entry.slug === 'seed').kind, 'placeholder');
  } finally {
    needleDigests.delete(synthetic);
    colourTokenException.delete(synthetic);
  }
});

test('a documentation hub page is mapped like any other page', async () => {
  const raw = '# Docs hub\n\nEvery sibling repository sends its pages, mirroring five flower-named personas.\n\n## Sibling folders\n';
  const fetchImpl = async (url) => {
    if (url.includes('/git/trees/')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => '',
        json: async () => ({ sha: 'c'.repeat(40), tree: [{ type: 'blob', path: 'docs/sibling-page.md' }] })
      };
    }
    if (url.includes('/docs/sibling-page.md')) return { ok: true, status: 200, headers: { get: () => null }, text: async () => raw, json: async () => ({}) };
    return { ok: false, status: 404, headers: { get: () => null }, text: async () => '', json: async () => ({}) };
  };
  const pages = await collectDocsCorpus(fetchImpl, { sources: {} }, '', []);
  const page = pages.find((entry) => entry.slug === 'sibling-page');
  assert.equal(page.kind, 'hub');
  assert.equal(page.title, 'Docs hub', 'the title maps too; this one carries no word of its own');
  assert.match(page.body, /Every peer repository sends its pages\./);
  assert.doesNotMatch(page.body, /sibling|personas/);
  assert.deepEqual(page.headings, ['Peer folders']);
});

test('a hub page that cannot be fetched renders a placeholder instead of vanishing', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/git/trees/')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => '',
        json: async () => ({ sha: 'c'.repeat(40), tree: [{ type: 'blob', path: 'docs/gone-page.md' }] })
      };
    }
    return { ok: false, status: 404, headers: { get: () => null }, text: async () => '', json: async () => ({}) };
  };
  const pages = await collectDocsCorpus(fetchImpl, { sources: {} }, '', []);
  const page = pages.find((entry) => entry.slug === 'gone-page');
  assert.equal(page.kind, 'placeholder', 'a missing hub page is visible as a placeholder, never silently dropped');
  assert.match(page.body, /it could not be fetched in this build/);
});

test('a hub tree that cannot be fetched fails the build when no snapshot pages exist', async () => {
  const fetchImpl = async () => ({ ok: false, status: 403, headers: { get: () => null }, text: async () => '', json: async () => ({}) });
  await assert.rejects(collectDocsCorpus(fetchImpl, { sources: {} }, '', []), /documentation hub tree could not be fetched/);
});

test('a hub tree failure falls back to the snapshot\'s hub pages when they exist', async () => {
  const snapshotHub = /** @type {import('../../src/lib/content/docs-corpus.mjs').DocsPage} */ ({ slug: 'kept', title: 'Kept', repo: 'docs', head: 'd'.repeat(40), sourcePath: 'docs/kept.md', kind: 'hub', body: '# Kept\n\nkept text', headings: [] });
  const fetchImpl = async () => ({ ok: false, status: 403, headers: { get: () => null }, text: async () => '', json: async () => ({}) });
  const pages = await collectDocsCorpus(fetchImpl, { sources: {} }, '', [snapshotHub]);
  const page = pages.find((entry) => entry.slug === 'kept');
  assert.equal(page.kind, 'hub', 'the snapshot keeps the hub alive when the tree is unreachable');
  assert.equal(page.head, 'd'.repeat(40));
});

test('a failed docs index keeps exactly one root entry', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/git/trees/')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => '',
        json: async () => ({ sha: 'c'.repeat(40), tree: [{ type: 'blob', path: 'docs/index.md' }, { type: 'blob', path: 'docs/kept.md' }] })
      };
    }
    if (url.includes('/docs/kept.md')) return { ok: true, status: 200, headers: { get: () => null }, text: async () => '# Kept\n\nkept text', json: async () => ({}) };
    return { ok: false, status: 404, headers: { get: () => null }, text: async () => '', json: async () => ({}) };
  };
  const pages = await collectDocsCorpus(fetchImpl, { sources: {} }, '', []);
  const roots = pages.filter((page) => page.slug === '');
  assert.equal(roots.length, 1, 'exactly one entry claims the root docs route');
  assert.equal(roots[0].kind, 'placeholder', 'the root is the index placeholder, not a second synthetic one');
});

test('a placeholder title runs through the map too', async () => {
  const raw = '# Sibling sync\n\nThe queue drains sibling jobs.\n';
  const manifest = { sources: { seed: { name: 'seed', head: 'a'.repeat(40), files: [{ path: 'README.md', sha256: 'f'.repeat(64) }] } } };
  const fetchImpl = async (url) => {
    if (url.includes('sources/seed/README.md')) return { ok: true, status: 200, headers: { get: () => null }, text: async () => raw, json: async () => ({}) };
    if (url.includes('/git/trees/')) return { ok: true, status: 200, headers: { get: () => null }, text: async () => '', json: async () => ({ sha: 'b'.repeat(40), tree: [] }) };
    return { ok: false, status: 404, headers: { get: () => null }, text: async () => '', json: async () => ({}) };
  };
  const pages = await collectDocsCorpus(fetchImpl, manifest, '', []);
  const page = pages.find((entry) => entry.slug === 'seed');
  assert.equal(page.kind, 'placeholder');
  assert.equal(page.title, 'Peer sync', 'the title is mapped even though the body is not published');
});
