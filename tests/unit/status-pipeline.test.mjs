import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { gatherSiteStatus, collectPipeline } from '../../src/lib/content/pipeline.mjs';
import { validateManifest, validateStatus, stable } from '../../src/lib/content/schema.mjs';
import { ciSummary, refreshLiveFields } from '../../src/lib/live-status.mjs';
import { recomputeStoredDigests } from '../../scripts/snapshot-digests.mjs';

const manifest = validateManifest({
  version: 1,
  generatedAt: '2026-11-25T00:00:00.000Z',
  sources: {
    seed: {
      name: 'seed',
      head: 'a'.repeat(40),
      syncedAt: '2026-11-25T00:00:00.000Z',
      files: [{ path: 'README.md', sha256: 'b'.repeat(64), bytes: 10 }]
    }
  }
});

function response(value, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => value,
    text: async () => typeof value === 'string' ? value : JSON.stringify(value)
  };
}

test('schema validation fails closed on missing status fields', () => {
  assert.throws(() => validateStatus({ version: 1, gatheredBy: 'site', repositories: {}, vivarium: {} }), /schema validation/);
});

test('CI aggregation distinguishes running, failing and absent checks', () => {
  assert.equal(ciSummary([]), 'no checks');
  assert.equal(ciSummary([{ status: 'queued', conclusion: null }]), 'in progress');
  assert.equal(ciSummary([{ status: 'completed', conclusion: 'success' }, { status: 'completed', conclusion: 'failure' }]), 'failure');
});

test('site fallback calculates documentation freshness and pin drift', async () => {
  const head = 'c'.repeat(40);
  const fetchImpl = async (url) => {
    if (url.endsWith('/branches/main')) return response({ commit: { sha: head } });
    if (url.endsWith('/check-runs')) return response({ check_runs: [{ status: 'completed', conclusion: 'success' }] });
    if (url.includes('/pulls?')) return response([], 200, { link: '<https://api.github.com/example?page=3>; rel="last"' });
    if (url.endsWith('/releases/latest')) return response({}, 404);
    if (url.endsWith('/tags?per_page=1')) return response([{ name: 'v1.2.3' }]);
    if (url.endsWith('/package.json')) return response({ version: '1.2.3' });
    return response({ pushed_at: '2026-11-25T01:00:00.000Z' });
  };
  const status = await gatherSiteStatus(fetchImpl, manifest, { systems: [{ name: 'seed', commit: 'a'.repeat(40) }] });
  assert.equal(status.gatheredBy, 'site');
  assert.equal(status.repositories.seed.openPrCount, 3);
  assert.equal(status.repositories.seed.docsFreshness.fresh, false);
  assert.equal(status.repositories.seed.latestRelease, 'v1.2.3');
  assert.equal(status.vivarium.systems.seed.drift, true);
});

test('live refresh keeps build data when the public API fails', async () => {
  const base = await gatherSiteStatus(async () => response({}), { sources: {} }, { systems: [] });
  const failed = await refreshLiveFields(base, { fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal(failed.complete, false);
  assert.equal(failed.repositories.lattice.head, base.repositories.lattice.head);
  const live = await refreshLiveFields(base, {
    fetchImpl: async (url) => url.endsWith('/check-runs')
      ? response({ check_runs: [{ status: 'completed', conclusion: 'success' }] })
      : response({ pushed_at: '2026-11-25T02:00:00.000Z' }),
    now: () => new Date('2026-11-25T03:00:00.000Z')
  });
  assert.equal(live.complete, true);
  assert.equal(live.observedAt, '2026-11-25T03:00:00.000Z');
});

test('stable serialization sorts object keys recursively', () => {
  assert.deepEqual(Object.keys(stable({ z: 1, a: { z: 2, a: 3 } })), ['a', 'z']);
  assert.deepEqual(Object.keys(stable({ z: 1, a: 2 }).a ?? {}), []);
});

test('committed snapshot remains schema valid after refresh', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../../src/data/snapshot/pipeline.json', import.meta.url), 'utf8'));
  validateManifest(snapshot.manifest);
  validateStatus(snapshot.status);
  assert.ok(snapshot.capturedAt);
});

test('recomputed snapshot digests verify the stored text', () => {
  const text = '# Peer sync\n\nmapped body\n';
  const snapshot = {
    manifest: { sources: { seed: { name: 'seed', head: 'a'.repeat(40), files: [{ path: 'README.md', sha256: 'f'.repeat(64) }] } } },
    documents: { 'sources/seed/README.md': text },
    docsPages: []
  };
  recomputeStoredDigests(snapshot);
  assert.equal(snapshot.manifest.sources.seed.files[0].sha256, createHash('sha256').update(text).digest('hex'));
});

test('the committed snapshot text verifies against its own manifest after the mapping', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../../src/data/snapshot/pipeline.json', import.meta.url), 'utf8'));
  for (const [name, source] of Object.entries(snapshot.manifest.sources)) {
    for (const record of source.files ?? []) {
      const text = snapshot.documents[`sources/${name}/${record.path}`];
      if (typeof text !== 'string') continue;
      assert.equal(
        createHash('sha256').update(text).digest('hex'),
        record.sha256,
        `${name}/${record.path}: the stored text and its recorded digest disagree`
      );
    }
  }
});

test('a no-network build renders the offline snapshot through the neutral mapping', async () => {
  const head = 'a'.repeat(40);
  const mapped = '# Peer sync\n\nThe queue drains peer jobs.\n';
  const snapshot = {
    capturedAt: '2026-11-25T00:00:00.000Z',
    manifest: validateManifest({
      version: 1,
      generatedAt: '2026-11-25T00:00:00.000Z',
      sources: { seed: { name: 'seed', head, syncedAt: '2026-11-25T00:00:00.000Z', files: [{ path: 'README.md', sha256: createHash('sha256').update(mapped).digest('hex'), bytes: mapped.length }] } }
    }),
    status: validateStatus(stable({
      version: 1,
      gatheredBy: 'snapshot',
      repositories: { seed: { head, lastPushAt: '2026-11-25T00:00:00.000Z', ciConclusion: 'no checks', openPrCount: 0, latestRelease: null, packageVersion: '1.0.0', docsFreshness: { syncedHead: head, repositoryHead: head, fresh: true }, testTotals: 'not published', unknownFields: [] } },
      vivarium: { pinsPending: true, systems: {} }
    })),
    vivarium: { systems: [] },
    documents: { 'sources/seed/README.md': mapped },
    docsPages: [{ slug: 'seed', title: 'Peer sync', repo: 'seed', head, sourcePath: 'README.md', kind: 'source', body: mapped, headings: ['Peer sync'] }],
    sources: { manifest: 'snapshot', status: 'snapshot', vivarium: 'snapshot' }
  };
  const offline = async () => { throw new Error('offline'); };
  const pipeline = await collectPipeline({ fetchImpl: offline, snapshot });
  assert.equal(pipeline.snapshot.used, true);
  const page = pipeline.docsPages.find((entry) => entry.slug === 'seed');
  assert.equal(page.kind, 'source', 'a stored page renders, it does not fall back to a placeholder');
  assert.doesNotMatch(page.body, /sibling|personas/);
  assert.equal(pipeline.documents['sources/seed/README.md'], mapped);
});
