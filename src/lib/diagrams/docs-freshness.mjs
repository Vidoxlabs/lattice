import { node, shortCommit, svg, text } from './svg.mjs';

/**
 * Render documentation freshness per repository: the head the docs hub
 * synced versus the repository head, with fresh, stale and unknown states
 * expressed through data attributes resolved by tokens.
 *
 * @param {{ repositories: any[] }} catalog
 * @returns {{ graphic: string, rows: { name: string, synced: string, head: string, state: string }[] }}
 */
export function renderDocsFreshness(catalog) {
  const rows = catalog.repositories
    .filter((repository) => repository.kind !== 'site')
    .map((repository) => ({
      name: repository.name,
      synced: shortCommit(repository.head),
      head: shortCommit(repository.repositoryHead),
      state: repository.status.docsFreshness?.fresh === true ? 'fresh' : repository.status.docsFreshness?.fresh === false ? 'stale' : 'unknown'
    }));

  const content = [];
  const perRow = 3;
  const width = 232;
  const height = 56;
  rows.forEach((row, index) => {
    const x = 12 + (index % perRow) * (width + 20);
    const y = 44 + Math.floor(index / perRow) * (height + 40);
    content.push(node({ x, y, width, height, id: `freshness-${row.name}`, label: `${row.name}\n${row.synced} → ${row.head}`, ci: 'unknown', role: 'freshness' }));
    content.push(text({ x, y: y + height + 16, label: row.state, className: 'diagram-stage-state' }));
  });

  const graphic = svg({
    id: 'docs-freshness',
    title: 'Documentation freshness per repository',
    desc: 'For each repository, the head the documentation hub synced compared with the repository head. Fresh means the sync matches the head; stale means the head moved ahead of the sync.',
    width: 780,
    height: 44 + Math.ceil(rows.length / perRow) * (height + 40),
    content: content.join('')
  });
  return { graphic, rows };
}
