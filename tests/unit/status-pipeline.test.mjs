import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { gatherSiteStatus, collectPipeline } from '../../src/lib/content/pipeline.mjs';
import { validateManifest, validateStatus, stable } from '../../src/lib/content/schema.mjs';
import { ciSummary, refreshLiveFields, statusCacheSeconds } from '../../src/lib/live-status.mjs';
import { buildSnapshot } from '../../scripts/snapshot-digests.mjs';

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
  assert.equal(failed.repositories.lattice.sources.head, 'build', 'a failed fetch is labelled as build data');
  for (const source of Object.values(failed.repositories.lattice.sources)) assert.equal(source, 'build');
});

test('the live refresh returns the head it fetched and counts open pull requests', async () => {
  const base = await gatherSiteStatus(async () => response({}), { sources: {} }, { systems: [] });
  const movedHead = 'f'.repeat(40);
  const fetchImpl = async (url) => {
    if (url.endsWith('/branches/main')) return response({ commit: { sha: movedHead } });
    if (url.endsWith('/check-runs')) return response({ check_runs: [{ status: 'completed', conclusion: 'success' }] });
    if (url.includes('/pulls?')) return response([], 200, { link: '<https://api.github.com/repos/Vidoxlabs/lattice/pulls?state=open&per_page=1&page=13>; rel="last"' });
    return response({ pushed_at: '2026-11-25T02:00:00.000Z' });
  };
  const live = await refreshLiveFields(base, { fetchImpl, now: () => new Date('2026-11-25T03:00:00.000Z') });
  assert.equal(live.complete, true);
  assert.equal(live.observedAt, '2026-11-25T03:00:00.000Z');
  const lattice = live.repositories.lattice;
  assert.equal(lattice.head, movedHead, 'the fetched head is returned, not the build head');
  assert.equal(lattice.ciConclusion, 'success', 'a completed check run reads as success, even when the build said in progress');
  assert.equal(lattice.openPrCount, 13);
  assert.equal(lattice.lastPushAt, '2026-11-25T02:00:00.000Z');
  assert.deepEqual(lattice.sources, { head: 'live', ciConclusion: 'live', lastPushAt: 'live', openPrCount: 'live' });
});

test('without a token, a repository whose head has not moved keeps its build values and skips check runs', async () => {
  const head = 'a'.repeat(40);
  const pushed = '2026-11-25T01:00:00.000Z';
  const baseFetch = async (url) => {
    if (url.endsWith('/branches/main')) return response({ commit: { sha: head } });
    if (url.endsWith('/check-runs')) return response({ check_runs: [{ status: 'in_progress', conclusion: null }] });
    if (url.includes('/pulls?')) return response([]);
    return response({ pushed_at: pushed });
  };
  const base = await gatherSiteStatus(baseFetch, { sources: {} }, { systems: [] });
  assert.equal(base.repositories.lattice.ciConclusion, 'in progress');
  const calls = [];
  const live = await refreshLiveFields(base, {
    fetchImpl: async (url) => {
      calls.push(url);
      return baseFetch(url);
    },
    now: () => new Date('2026-11-25T03:00:00.000Z')
  });
  const lattice = live.repositories.lattice;
  assert.equal(lattice.head, head);
  assert.equal(lattice.sources.head, 'build', 'the build head is labelled, never passed off as live');
  assert.equal(lattice.ciConclusion, 'in progress');
  assert.equal(lattice.sources.ciConclusion, 'build', 'an unchanged head keeps the build check conclusion');
  assert.equal(lattice.sources.lastPushAt, 'live');
  assert.equal(lattice.sources.openPrCount, 'build');
  assert.ok(!calls.some((url) => url.includes('/check-runs')), 'check runs are not fetched for an unchanged head');
  assert.ok(!calls.some((url) => url.includes('/branches/')), 'the branch head is not fetched for an unmoved repository');
});

test('with a token, one GraphQL query covers every repository', async () => {
  const base = await gatherSiteStatus(async () => response({}), { sources: {} }, { systems: [] });
  const posts = [];
  const fetchImpl = async (url, init) => {
    posts.push({ url, init });
    return response({
      data: {
        r0: {
          defaultBranchRef: { target: { oid: 'a'.repeat(40), pushedDate: '2026-11-25T02:00:00Z', checkSuites: { nodes: [{ checkRuns: { nodes: [{ status: 'completed', conclusion: 'success' }] } }] } } },
          pullRequests: { totalCount: 2 }
        },
        r1: {
          defaultBranchRef: { target: { oid: 'b'.repeat(40), pushedDate: '2026-11-25T02:30:00Z', checkSuites: { nodes: [] } } },
          pullRequests: { totalCount: 0 }
        }
      }
    });
  };
  const live = await refreshLiveFields(base, { fetchImpl, token: 'test-token', now: () => new Date('2026-11-25T03:00:00.000Z') });
  assert.equal(posts.length, 1, 'the whole refresh is one query');
  assert.equal(posts[0].url, 'https://api.github.com/graphql');
  assert.equal(posts[0].init.headers.Authorization, 'Bearer test-token');
  assert.ok(JSON.parse(posts[0].init.body).query.includes('name: "lattice"'), 'the query names the repositories it covers');
  assert.equal(live.complete, true);
  assert.equal(live.repositories.docs.head, 'a'.repeat(40));
  assert.equal(live.repositories.docs.ciConclusion, 'success');
  assert.equal(live.repositories.docs.openPrCount, 2);
  assert.equal(live.repositories.lattice.head, 'b'.repeat(40));
  assert.equal(live.repositories.lattice.ciConclusion, 'no checks', 'a commit with no check runs says so');
  for (const repository of Object.values(live.repositories)) {
    assert.deepEqual(Object.values(repository.sources).every((source) => source === 'live'), true);
  }
});

test('a failed GraphQL refresh keeps every build value labelled build', async () => {
  const base = await gatherSiteStatus(async () => response({}), { sources: {} }, { systems: [] });
  const live = await refreshLiveFields(base, { fetchImpl: async () => response({}, 403), token: 'test-token' });
  assert.equal(live.complete, false);
  for (const repository of Object.values(live.repositories)) {
    for (const source of Object.values(repository.sources)) assert.equal(source, 'build');
  }
});

test('a degraded refresh asks for one minute of cache and a complete one for five', () => {
  assert.equal(statusCacheSeconds(false), 60);
  assert.equal(statusCacheSeconds(true), 300);
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

test('stamping keeps the upstream digest and adds the stored digest; the pipeline is untouched', () => {
  const raw = '# Sibling sync\n\nraw upstream\n';
  const mapped = '# Peer sync\n\nraw upstream\n';
  const upstreamSha = createHash('sha256').update(raw).digest('hex');
  const storedSha = createHash('sha256').update(mapped).digest('hex');
  const pipeline = {
    manifest: { sources: { seed: { name: 'seed', head: 'a'.repeat(40), files: [{ path: 'README.md', sha256: upstreamSha, bytes: raw.length }] } } },
    documents: { 'sources/seed/README.md': { text: mapped, verified: true, safe: true } },
    docsPages: []
  };
  const snapshot = buildSnapshot(pipeline, '2026-11-25T00:00:00.000Z');
  assert.equal(snapshot.manifest.sources.seed.files[0].sha256, upstreamSha, 'the upstream digest is kept, not overwritten');
  assert.equal(snapshot.manifest.sources.seed.files[0].storedSha256, storedSha, 'the stored text carries its own digest');
  assert.equal(snapshot.capturedAt, '2026-11-25T00:00:00.000Z');
  assert.equal(pipeline.manifest.sources.seed.files[0].storedSha256, undefined, 'the collected pipeline is untouched by the stamping');
  assert.equal(pipeline.manifest.sources.seed.files[0].sha256, upstreamSha, 'the collected pipeline keeps the upstream digests');
});

test('the committed snapshot text verifies against its own stored digests', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../../src/data/snapshot/pipeline.json', import.meta.url), 'utf8'));
  for (const [name, source] of Object.entries(snapshot.manifest.sources)) {
    for (const record of source.files ?? []) {
      const entry = snapshot.documents[`sources/${name}/${record.path}`];
      const text = typeof entry === 'string' ? entry : entry?.text;
      if (typeof text !== 'string') continue;
      assert.ok(record.storedSha256, `${name}/${record.path}: a stored text carries its own digest`);
      assert.equal(
        createHash('sha256').update(text).digest('hex'),
        record.storedSha256,
        `${name}/${record.path}: the stored text and its stored digest disagree`
      );
    }
  }
});

function snapshotFixture(/** @type {{ upstreamSha: string, storedSha: string, mapped: string, head: string }} */ parts) {
  return {
    capturedAt: '2026-11-25T00:00:00.000Z',
    manifest: validateManifest({
      version: 1,
      generatedAt: '2026-11-25T00:00:00.000Z',
      sources: {
        seed: {
          name: 'seed',
          head: parts.head,
          syncedAt: '2026-11-25T00:00:00.000Z',
          files: [{ path: 'README.md', sha256: parts.upstreamSha, bytes: 64, storedSha256: parts.storedSha }]
        }
      }
    }),
    status: validateStatus(stable({
      version: 1,
      gatheredBy: 'snapshot',
      repositories: { seed: { head: parts.head, lastPushAt: '2026-11-25T00:00:00.000Z', ciConclusion: 'no checks', openPrCount: 0, latestRelease: null, packageVersion: '1.0.0', docsFreshness: { syncedHead: parts.head, repositoryHead: parts.head, fresh: true }, testTotals: 'not published', unknownFields: [] } },
      vivarium: { pinsPending: true, systems: {} }
    })),
    vivarium: { systems: [] },
    documents: { 'sources/seed/README.md': parts.mapped },
    docsPages: [
      { slug: 'seed', title: 'Peer sync', repo: 'seed', head: parts.head, sourcePath: 'README.md', kind: 'source', body: parts.mapped, headings: [] },
      { slug: '', title: 'Vidoxlabs docs', repo: 'docs', head: parts.head, sourcePath: 'docs/index.md', kind: 'hub', body: '# Docs hub\n', headings: [] }
    ],
    sources: { manifest: 'snapshot', status: 'snapshot', vivarium: 'snapshot' }
  };
}

test('a no-network build renders the offline snapshot through the neutral mapping', async () => {
  const raw = '# Sibling sync\n\nThe queue drains sibling jobs, mirroring five flower-named personas.\n';
  const mapped = '# Peer sync\n\nThe queue drains peer jobs.\n';
  const snapshot = snapshotFixture({
    head: 'a'.repeat(40),
    upstreamSha: createHash('sha256').update(raw).digest('hex'),
    storedSha: createHash('sha256').update(mapped).digest('hex'),
    mapped
  });
  const offline = async () => { throw new Error('offline'); };
  const pipeline = await collectPipeline({ fetchImpl: offline, snapshot });
  assert.equal(pipeline.snapshot.used, true);
  const page = pipeline.docsPages.find((entry) => entry.slug === 'seed');
  assert.equal(page.kind, 'source', 'a stored page renders, it does not fall back to a placeholder');
  assert.doesNotMatch(page.body, /sibling|personas/);
  assert.equal(pipeline.documents['sources/seed/README.md'].text, mapped);
  assert.equal(pipeline.documents['sources/seed/README.md'].verified, true, 'the verification result is recorded beside the text');
});

test('a fresh snapshot text still renders when the manifest came in live but the file fetch failed', async () => {
  const raw = '# Sibling sync\n\nThe queue drains sibling jobs.\n';
  const mapped = '# Peer sync\n\nThe queue drains peer jobs.\n';
  const snapshot = snapshotFixture({
    head: 'a'.repeat(40),
    upstreamSha: createHash('sha256').update(raw).digest('hex'),
    storedSha: createHash('sha256').update(mapped).digest('hex'),
    mapped
  });
  // The manifest and status come in live; every file fetch fails.
  const halfUp = async (url) => {
    if (url.endsWith('manifest.json') || url.endsWith('status.json')) {
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify(url.endsWith('manifest.json') ? snapshot.manifest : snapshot.status), json: async () => (url.endsWith('manifest.json') ? snapshot.manifest : snapshot.status) };
    }
    return { ok: false, status: 403, headers: { get: () => null }, text: async () => '', json: async () => ({}) };
  };
  const pipeline = await collectPipeline({ fetchImpl: halfUp, snapshot });
  const page = pipeline.docsPages.find((entry) => entry.slug === 'seed');
  assert.equal(page.kind, 'source', 'a snapshot current with the live manifest still renders');
  assert.doesNotMatch(page.body, /sibling/);
  assert.equal(pipeline.documents['sources/seed/README.md'].text, mapped);
  assert.equal(pipeline.documents['sources/seed/README.md'].verified, true, 'the verification result is recorded beside the text');
});

test('a stale snapshot text does not pass for moved upstream text', async () => {  const raw = '# Sibling sync\n\nThe queue drains sibling jobs.\n';
  const mapped = '# Peer sync\n\nThe queue drains peer jobs.\n';
  const snapshot = snapshotFixture({
    head: 'a'.repeat(40),
    upstreamSha: createHash('sha256').update(raw).digest('hex'),
    storedSha: createHash('sha256').update(mapped).digest('hex'),
    mapped
  });
  const movedManifest = JSON.parse(JSON.stringify(snapshot.manifest));
  movedManifest.sources.seed.files[0].sha256 = 'e'.repeat(64);
  const halfUp = async (url) => {
    if (url.endsWith('manifest.json')) {
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify(movedManifest), json: async () => movedManifest };
    }
    if (url.endsWith('status.json')) {
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify(snapshot.status), json: async () => snapshot.status };
    }
    return { ok: false, status: 403, headers: { get: () => null }, text: async () => '', json: async () => ({}) };
  };
  const pipeline = await collectPipeline({ fetchImpl: halfUp, snapshot });
  const page = pipeline.docsPages.find((entry) => entry.slug === 'seed');
  assert.equal(page.kind, 'placeholder', 'upstream moved past the snapshot, so the page is a labelled placeholder');
});

test('a no-network build succeeds entirely from the committed snapshot', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../../src/data/snapshot/pipeline.json', import.meta.url), 'utf8'));
  assert.ok(snapshot.docsPages.some((page) => page.kind === 'hub'), 'the committed snapshot carries hub pages');
  assert.ok(snapshot.docsPages.some((page) => page.kind === 'hub' && page.repo === 'docs'), "it carries the docs repository's own pages");
  const offline = async () => { throw new Error('offline'); };
  const pipeline = await collectPipeline({ fetchImpl: offline, snapshot });
  assert.equal(pipeline.snapshot.used, true);
  assert.equal(pipeline.docsPages.length, snapshot.docsPages.length, 'every page the snapshot stores renders');
  assert.equal(
    pipeline.docsPages.filter((page) => page.kind === 'placeholder').length,
    snapshot.docsPages.filter((page) => page.kind === 'placeholder').length,
    'no page degrades beyond the placeholders the snapshot already records'
  );
  assert.equal(Object.keys(pipeline.documents).length, Object.keys(snapshot.documents).length, 'every stored document renders');
});
