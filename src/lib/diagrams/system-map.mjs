import { edge, node, shortCommit, svg, text } from './svg.mjs';

const LAYERS = {
  bloom: { label: 'bloom\ninterface layer', x: 300, y: 24, width: 160, height: 64, role: 'interface' },
  peers: [
    { id: 'capillary', x: 24, y: 168, width: 160, height: 64 },
    { id: 'myosotis', x: 206, y: 168, width: 160, height: 64 },
    { id: 'aestivation', x: 388, y: 168, width: 160, height: 64 },
    { id: 'drosera', x: 570, y: 168, width: 160, height: 64 }
  ],
  seed: { id: 'seed', x: 300, y: 312, width: 160, height: 64, role: 'foundation' },
  trellis: { id: 'trellis', x: 596, y: 312, width: 134, height: 64, role: 'alongside' }
};

/**
 * Render the Vivarium system map: bloom as the interface layer, the four
 * independent peers, seed as the foundation, trellis alongside. Node state
 * comes from live status; pin edges come from the umbrella manifest.
 *
 * @param {{ repositories: any[], vivarium: { systems?: any[] }, status: { repositories?: Record<string, any>, vivarium?: { systems?: Record<string, { drift?: boolean | null }> } } }} catalog
 * @returns {{ graphic: string, rows: { name: string, layer: string, pin: string, head: string, ci: string, drift: string }[] }}
 */
export function renderSystemMap(catalog) {
  const pinFor = (name) => catalog.vivarium.systems?.find((system) => system.name === name)?.commit ?? null;
  const driftFor = (name) => catalog.status.vivarium?.systems?.[name]?.drift ?? null;
  const stateFor = (name) => catalog.status.repositories?.[name]?.ciConclusion ?? 'unknown';
  const headFor = (name) => catalog.status.repositories?.[name]?.head ?? null;

  const bloom = LAYERS.bloom;
  const content = [];
  content.push(text({ x: 8, y: 16, label: 'Interface layer', className: 'diagram-tier', emphasis: true }));
  content.push(node({ ...bloom, id: 'bloom', label: bloom.label, ci: stateFor('bloom'), drift: driftFor('bloom'), role: bloom.role }));
  content.push(text({ x: 8, y: 152, label: 'Independent peers (never import each other)', className: 'diagram-tier', emphasis: true }));
  for (const peer of LAYERS.peers) {
    content.push(node({ ...peer, id: peer.id, label: peer.id, ci: stateFor(peer.id), drift: driftFor(peer.id) }));
    content.push(edge({ x1: bloom.x + bloom.width / 2, y1: bloom.y + bloom.height, x2: peer.x + peer.width / 2, y2: peer.y, kind: 'orchestration' }));
  }
  content.push(text({ x: 8, y: 296, label: 'Foundation contracts', className: 'diagram-tier', emphasis: true }));
  const seed = LAYERS.seed;
  content.push(node({ ...seed, id: 'seed', label: 'seed', ci: stateFor('seed'), drift: driftFor('seed'), role: seed.role }));
  for (const peer of LAYERS.peers) {
    content.push(edge({ x1: peer.x + peer.width / 2, y1: peer.y + peer.height, x2: seed.x + seed.width / 2, y2: seed.y, label: '', kind: 'dependency' }));
  }
  const trellis = LAYERS.trellis;
  content.push(text({ x: 596, y: 296, label: 'Alongside', className: 'diagram-tier', emphasis: true }));
  content.push(node({ ...trellis, id: 'trellis', label: 'trellis', ci: stateFor('trellis'), drift: driftFor('trellis'), role: trellis.role }));
  content.push(edge({ x1: trellis.x, y1: trellis.y + trellis.height / 2, x2: seed.x + seed.width, y2: seed.y + seed.height / 2, kind: 'observation' }));

  const rows = ['bloom', 'capillary', 'myosotis', 'aestivation', 'drosera', 'seed', 'trellis'].map((name) => {
    const layer = name === 'bloom' ? 'interface layer' : name === 'seed' ? 'foundation' : name === 'trellis' ? 'alongside' : 'independent peer';
    const drift = driftFor(name);
    return {
      name,
      layer,
      pin: shortCommit(pinFor(name)),
      head: shortCommit(headFor(name)),
      ci: stateFor(name),
      drift: drift === null ? 'unknown' : drift ? 'drifted' : 'pinned'
    };
  });

  const graphic = svg({
    id: 'vivarium-system-map',
    title: 'Vivarium system map',
    desc: 'bloom is the interface layer above four independent peers that run on the seed foundation, with trellis testing alongside. Nodes are labelled with their pinned commit and CI state; a drifted pin is highlighted.',
    width: 760,
    height: 400,
    content: content.join('')
  });
  return { graphic, rows };
}
