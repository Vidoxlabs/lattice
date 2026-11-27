import { createHash } from 'node:crypto';
import { isPublicContentSafe } from './content-safety.mjs';
import pipeline from '../data/generated/build-pipeline.json' with { type: 'json' };

const names = ['vivarium', 'seed', 'bloom', 'capillary', 'myosotis', 'aestivation', 'drosera', 'trellis', 'docs', 'videsign', 'lattice'];
const kinds = { vivarium: 'umbrella', docs: 'docs', videsign: 'design', lattice: 'site' };
let catalogPromise;

export function firstParagraph(markdown) {
  const lines = markdown.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith('#') || line.startsWith('<') || line.startsWith('[!') || line.startsWith('![') || line.startsWith('```')) continue;
    return line.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '');
  }
  return '';
}

export function firstCommandBlock(markdown) {
  const match = markdown.match(/```(?:sh|bash|shell|console)?\s*\n([\s\S]*?)```/i);
  return match?.[1]?.trim() ?? '';
}

export async function readSyncedReadme(manifest, name) {
  const entry = manifest.sources?.[name];
  const record = entry?.files?.find((file) => file.path === 'README.md');
  if (!entry || !record?.sha256) return { text: '', head: entry?.head ?? null, synced: false };
  const text = pipeline.documents[`sources/${name}/README.md`];
  if (typeof text !== 'string') return { text: '', head: entry.head, synced: false };
  const digest = createHash('sha256').update(text).digest('hex');
  if (digest !== record.sha256 || !isPublicContentSafe(text)) return { text: '', head: entry.head, synced: false };
  return { text, head: entry.head, synced: true };
}

export function getCatalog() {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const { manifest, vivarium, pinsPending, status, sources, snapshot } = pipeline;
      const repositories = await Promise.all(names.map(async (name) => {
        const readme = name === 'lattice' ? { text: '', head: null, synced: false } : await readSyncedReadme(manifest, name);
        const system = vivarium.systems?.find((entry) => entry.name === name);
        const docsEntry = manifest.sources?.[name];
        const current = status.repositories?.[name] ?? {
          ciConclusion: 'unknown',
          lastPushAt: null,
          openPrCount: null,
          latestRelease: null,
          docsFreshness: { syncedHead: docsEntry?.head ?? null, repositoryHead: null, fresh: null },
          testTotals: 'not published'
        };
        return {
          name,
          kind: kinds[name] ?? 'system',
          summary: name === 'lattice' ? 'The Vidoxlabs website: Vivarium, its systems, live status and docs.' : firstParagraph(readme.text),
          synced: name === 'lattice' || readme.synced,
          head: docsEntry?.head ?? null,
          repositoryHead: current.head ?? null,
          syncedAt: docsEntry?.syncedAt ?? null,
          docsFiles: docsEntry?.files?.filter((file) => file.path.endsWith('.md')) ?? [],
          pin: system?.commit ?? null,
          drift: status.vivarium.systems?.[name]?.drift ?? null,
          version: system?.version ?? current.packageVersion ?? null,
          layer: system?.layer ?? null,
          role: system?.role ?? null,
          owns: system?.owns ?? [],
          importsToday: system?.importsToday ?? [],
          status: current
        };
      }));
      return { repositories, manifest, vivarium, pinsPending, status, sources, snapshot };
    })();
  }
  return catalogPromise;
}

export async function getRepository(name) {
  const catalog = await getCatalog();
  const repository = catalog.repositories.find((entry) => entry.name === name);
  if (!repository) return null;
  const readme = name === 'lattice' ? { text: '', head: null, synced: false } : await readSyncedReadme(catalog.manifest, name);
  return { ...repository, quickstart: firstCommandBlock(readme.text), readmeSynced: readme.synced };
}

export function sourceUrl(name, head, path = 'README.md') {
  return `https://github.com/Vidoxlabs/${name}/blob/${head ?? 'main'}/${path}`;
}
