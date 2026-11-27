/**
 * Describe the self-updating pipeline with the source of each stage on this build.
 *
 * @param {{ sources: { manifest: string, status: string, vivarium: string }, snapshot: { used: boolean, capturedAt: string | null }, manifest: { generatedAt?: string }, status: { repositories?: Record<string, any> } }} pipeline
 * @param {{ freshCount: number, systemCount: number }} freshness
 * @returns {{ stages: { id: string, label: string, state: string }[], rows: { id: string, stage: string, state: string }[] }}
 */
export function renderPipelineFlow(pipeline, freshness) {
  const stages = [
    { id: 'system-docs', label: 'A system changes its docs', state: `${freshness.freshCount}/${freshness.systemCount} system docs current` },
    { id: 'docs-sync', label: 'The docs hub syncs and digests', state: pipeline.sources.manifest === 'docs' ? `Manifest generated ${pipeline.manifest.generatedAt ?? 'unknown time'}` : 'Manifest from the committed snapshot' },
    { id: 'docs-status', label: 'Status is gathered once', state: pipeline.sources.status === 'docs' ? 'Published by docs' : pipeline.sources.status === 'site' ? 'Gathered by the site; docs publication is proposed' : `Committed snapshot captured ${pipeline.snapshot.capturedAt ?? 'unknown time'}` },
    { id: 'rebuild', label: 'One deploy hook rebuilds lattice', state: pipeline.snapshot.used ? 'Rebuild used the labelled snapshot fallback' : 'Rebuild read docs at build time' },
    { id: 'render', label: 'Pages verify digests, then render', state: pipeline.sources.status === 'docs' ? 'Status published by docs' : 'Status labelled by its source' },
    { id: 'live', label: 'The status API refreshes live fields', state: 'Five-minute cache, degrades to build data' }
  ];
  return { stages, rows: stages.map((stage) => ({ ...stage, stage: stage.label })) };
}
