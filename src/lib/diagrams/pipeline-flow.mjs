import { edge, node, svg, text } from './svg.mjs';

/**
 * Render the self-updating pipeline (the site's core rule): a system's docs
 * change, the docs hub syncs and records digests, a deploy hook rebuilds the
 * site, pages and diagrams render from verified data, and the status API
 * keeps live fields fresh between rebuilds. Each stage shows where its input
 * came from on this build.
 *
 * @param {{ sources: { manifest: string, status: string, vivarium: string }, snapshot: { used: boolean, capturedAt: string | null }, manifest: { generatedAt?: string }, status: { repositories?: Record<string, any> } }} pipeline
 * @param {{ freshCount: number, systemCount: number }} freshness
 * @returns {{ graphic: string, rows: { stage: string, state: string }[] }}
 */
export function renderPipelineFlow(pipeline, freshness) {
  const stages = [
    { id: 'system-docs', label: 'A system\nchanges its docs', state: `${freshness.freshCount}/${freshness.systemCount} system docs current` },
    { id: 'docs-sync', label: 'The docs hub\nsyncs and digests', state: pipeline.sources.manifest === 'docs' ? `manifest generated ${pipeline.manifest.generatedAt ?? 'unknown time'}` : 'manifest from the committed snapshot' },
    { id: 'docs-status', label: 'Status is\ngathered once', state: pipeline.sources.status === 'docs' ? 'published by docs' : pipeline.sources.status === 'site' ? 'gathered by the site (docs publication is proposed)' : `committed snapshot captured ${pipeline.snapshot.capturedAt ?? 'unknown time'}` },
    { id: 'rebuild', label: 'One deploy hook\nrebuilds lattice', state: pipeline.snapshot.used ? 'rebuild used the labelled snapshot fallback' : 'rebuild read docs at build time' },
    { id: 'render', label: 'Pages verify\ndigests, then render', state: pipeline.sources.status === 'docs' ? 'status published by docs' : 'status labelled by its source' },
    { id: 'live', label: 'The status API\nrefreshes live fields', state: 'five-minute cache, degrades to build data' }
  ];

  const content = [];
  const width = 232;
  const height = 92;
  const gap = 20;
  stages.forEach((stage, index) => {
    const x = 12 + (index % 3) * (width + gap);
    const y = 44 + Math.floor(index / 3) * (height + 56);
    content.push(node({ x, y, width, height, id: stage.id, label: stage.label, ci: 'unknown', role: 'stage' }));
    content.push(text({ x, y: y + height + 18, label: stage.state, className: 'diagram-stage-state', anchor: 'start' }));
    if (index < stages.length - 1 && index % 3 < 2) {
      content.push(edge({ x1: x + width, y1: y + height / 2, x2: x + width + gap, y2: y + height / 2, kind: 'flow' }));
    }
  });
  content.push(edge({ x1: 12 + 2 * (width + gap) + width / 2, y1: 44 + height, x2: 12 + width / 2, y2: 44 + 56 + height, kind: 'flow-wrap' }));

  const rows = stages.map((stage) => ({ stage: stage.id, state: stage.state }));
  const graphic = svg({
    id: 'lattice-pipeline',
    title: 'The self-updating site pipeline',
    desc: 'Documentation changes upstream, the documentation hub syncs and digests it, one deploy hook rebuilds the site, pages verify digests before rendering, and the status API keeps live fields fresh between rebuilds.',
    width: 780,
    height: 320,
    content: content.join('')
  });
  return { graphic, rows };
}
