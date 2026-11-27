import assert from 'node:assert/strict';
import test from 'node:test';
import { esc } from '../../src/lib/diagrams/svg.mjs';
import { renderSystemMap } from '../../src/lib/diagrams/system-map.mjs';
import { renderPipelineFlow } from '../../src/lib/diagrams/pipeline-flow.mjs';
import { renderRepositoryActivity } from '../../src/lib/diagrams/repository-activity.mjs';
import { renderDocsFreshness } from '../../src/lib/diagrams/docs-freshness.mjs';

const catalog = {
  repositories: [
    { name: 'seed', kind: 'system', repositoryHead: 'c'.repeat(40), status: { docsFreshness: { fresh: true }, ciConclusion: 'success', lastPushAt: '2026-11-25T01:00:00Z', latestRelease: 'v1.0.0', openPrCount: 2 } },
    { name: 'lattice', kind: 'site', repositoryHead: null, status: { docsFreshness: { fresh: null }, ciConclusion: 'unknown', lastPushAt: null, latestRelease: null, openPrCount: null } }
  ],
  vivarium: { systems: [{ name: 'seed', commit: 'c'.repeat(40) }, { name: 'bloom', commit: 'b'.repeat(40) }] },
  status: {
    repositories: { seed: { ciConclusion: 'success', head: 'c'.repeat(40) }, bloom: { ciConclusion: 'failure', head: 'b'.repeat(40) } },
    vivarium: { systems: { seed: { drift: false }, bloom: { drift: true } } }
  }
};

const pipeline = {
  sources: { manifest: 'docs', status: 'site', vivarium: 'vivarium' },
  snapshot: { used: false, capturedAt: null },
  manifest: { generatedAt: '2026-11-25T13:31:20.000Z' },
  status: { repositories: {} }
};

test('the system map renders every layer with accessible structure', () => {
  const { graphic, rows } = renderSystemMap(catalog);
  assert.match(graphic, /<title id="vivarium-system-map-title">/);
  assert.match(graphic, /<desc id="vivarium-system-map-desc">/);
  for (const name of ['bloom', 'capillary', 'myosotis', 'aestivation', 'drosera', 'seed', 'trellis']) {
    assert.match(graphic, new RegExp(`data-node="${name}"`));
  }
  assert.match(graphic, /data-ci="success"/);
  assert.match(graphic, /data-ci="failure"/);
  assert.match(graphic, /data-drift="true"/);
  assert.equal(rows.length, 7);
  assert.equal(rows.find((row) => row.name === 'bloom').drift, 'drifted');
  assert.equal(rows.find((row) => row.name === 'seed').pin, 'ccccccc');
  assert.ok(!/#[0-9a-f]{6}|rgb\(/i.test(graphic), 'the graphic must carry no literal colours');
});

test('the pipeline flow labels each stage with its build source', () => {
  const { stages, rows } = renderPipelineFlow(pipeline, { freshCount: 3, systemCount: 7 });
  assert.equal(stages.length, 6);
  assert.ok(stages.every((stage) => stage.id && stage.label && stage.state));
  assert.match(rows.find((row) => row.id === 'docs-status').state, /committed snapshot|Gathered by the site/);
});

test('the repository activity timeline records each sourced event', () => {
  const repository = { name: 'seed', syncedAt: '2026-11-25T13:31:20.000Z', head: 'c'.repeat(40), repositoryHead: 'c'.repeat(40), status: catalog.repositories[0].status };
  const { graphic, rows } = renderRepositoryActivity(repository);
  assert.match(graphic, /<title id="activity-seed-title">/);
  assert.equal(rows.length, 5);
  assert.equal(rows.find((row) => row.event === 'Latest release').value, 'v1.0.0');
  assert.ok(!/#[0-9a-f]{6}|rgb\(/i.test(graphic), 'the graphic must carry no literal colours');
});

test('documentation freshness distinguishes fresh, stale and unknown', () => {
  const { graphic, rows } = renderDocsFreshness(catalog);
  assert.match(graphic, /<title id="docs-freshness-title">/);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].state, 'fresh');
  assert.ok(!/#[0-9a-f]{6}|rgb\(/i.test(graphic), 'the graphic must carry no literal colours');
});

test('diagram text escapes markup arriving from fetched sources', () => {
  assert.equal(esc('<script>&"\''), '&lt;script&gt;&amp;&quot;&apos;');
  const hostile = {
    ...catalog,
    vivarium: { systems: [{ name: 'seed', commit: 'c'.repeat(40) }] },
    status: { repositories: { seed: { ciConclusion: 'success"><script>', head: 'c'.repeat(40) } }, vivarium: { systems: {} } }
  };
  const { graphic } = renderSystemMap(hostile);
  assert.ok(!graphic.includes('"><script>'), 'fetched state must not inject markup');
});
