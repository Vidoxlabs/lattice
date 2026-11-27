import { node, shortCommit, svg, text } from './svg.mjs';

/**
 * Render one repository's activity timeline: documentation sync, last push
 * and latest release, each labelled with its own time or tag.
 *
 * @param {{ name: string, syncedAt: string | null, head: string | null, repositoryHead: string | null, status: { lastPushAt: string | null, latestRelease: string | null, ciConclusion: string, openPrCount: number | null } }} repository
 * @returns {{ graphic: string, rows: { event: string, value: string }[] }}
 */
export function renderRepositoryActivity(repository) {
  const events = [
    { id: 'docs-sync', label: 'Docs synced', value: repository.syncedAt ?? 'unknown', position: 0 },
    { id: 'last-push', label: 'Last push', value: repository.status.lastPushAt ?? 'unknown', position: 1 },
    { id: 'ci', label: 'CI at head', value: `${repository.status.ciConclusion} (${shortCommit(repository.repositoryHead)})`, position: 2 },
    { id: 'release', label: 'Latest release', value: repository.status.latestRelease ?? 'none published', position: 3 },
    { id: 'pulls', label: 'Open pull requests', value: repository.status.openPrCount === null ? 'unknown' : String(repository.status.openPrCount), position: 4 }
  ];
  const content = [];
  content.push(text({ x: 12, y: 20, label: `Activity timeline for ${repository.name}`, className: 'diagram-tier', emphasis: true }));
  events.forEach((event, index) => {
    const x = 36;
    const y = 48 + index * 42;
    content.push(node({ x, y, width: 200, height: 32, id: event.id, label: event.label, ci: 'unknown', role: 'event' }));
    content.push(text({ x: x + 216, y: y + 21, label: event.value, className: 'diagram-stage-state' }));
  });
  const rows = events.map((event) => ({ event: event.label, value: event.value }));
  const graphic = svg({
    id: `activity-${repository.name}`,
    title: `Activity timeline for ${repository.name}`,
    desc: `Documentation sync, last push, CI conclusion at the repository head, latest release and open pull-request count for ${repository.name}, each from its recorded source time.`,
    width: 560,
    height: 268,
    content: content.join('')
  });
  return { graphic, rows };
}
