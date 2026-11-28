import assert from 'node:assert/strict';
import test from 'node:test';
import { readSyncedReadme } from '../../src/lib/repository-data.mjs';

const manifest = {
  sources: {
    seed: { head: 'a'.repeat(40), syncedAt: '2026-11-25T00:00:00.000Z', files: [{ path: 'README.md', sha256: 'b'.repeat(64), bytes: 16 }] },
    bloom: { head: 'c'.repeat(40), syncedAt: '2026-11-25T00:00:00.000Z', files: [{ path: 'README.md', sha256: 'd'.repeat(64), bytes: 16 }] },
    lattice: { head: 'e'.repeat(40), syncedAt: '2026-11-25T00:00:00.000Z', files: [] }
  }
};

const documents = {
  'sources/seed/README.md': { text: '# Peer sync\n\nThe queue drains peer jobs.\n', verified: true, safe: true },
  'sources/bloom/README.md': { text: null, verified: true, safe: false }
};

test('a README whose stored text carries the neutral mapping still reads as synced', async () => {
  const readme = await readSyncedReadme(manifest, 'seed', documents);
  assert.equal(readme.synced, true, 'the recorded verification is trusted instead of re-hashing the mapped text');
  assert.equal(readme.state, 'published');
  assert.equal(readme.head, 'a'.repeat(40));
  assert.match(readme.text, /peer jobs/);
});

test('a verified README that failed the public-safety scan is synced but blocked', async () => {
  const readme = await readSyncedReadme(manifest, 'bloom', documents);
  assert.equal(readme.synced, true, 'the documentation is synced even when its text cannot be published');
  assert.equal(readme.state, 'blocked');
  assert.equal(readme.text, '', 'an unsafe text is never published, not even to the summary');
});

test('a repository the manifest really lacks is the only absent case', async () => {
  const readme = await readSyncedReadme(manifest, 'lattice', documents);
  assert.equal(readme.synced, false);
  assert.equal(readme.state, 'absent');
});

test('a recorded failure to verify reads as unverified, not absent', async () => {
  const readme = await readSyncedReadme(manifest, 'seed', { 'sources/seed/README.md': { text: null, verified: false, safe: false } });
  assert.equal(readme.synced, false);
  assert.equal(readme.state, 'unverified');
});
