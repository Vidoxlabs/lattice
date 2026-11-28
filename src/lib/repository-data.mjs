import pipeline from '../data/generated/build-pipeline.json' with { type: 'json' };

const names = ['vivarium', 'seed', 'bloom', 'capillary', 'myosotis', 'aestivation', 'drosera', 'trellis', 'docs', 'videsign', 'lattice'];
const kinds = { vivarium: 'umbrella', docs: 'docs', videsign: 'design', lattice: 'site' };
let catalogPromise;

/**
 * A summary a repository card can show when the synced README's text is not
 * publishable: honest static copy for the repositories whose description does
 * not arrive through the manifest.
 */
const fallbackSummaries = {
  umbrella: 'The Vivarium product umbrella: the product definition and the seven system pins.',
  docs: 'The documentation hub: every page this site renders is synced and digested there.',
  design: 'The design system whose tokens and components this site renders with.'
};

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

export async function readSyncedReadme(manifest, name, documents = pipeline.documents) {
  const entry = manifest.sources?.[name];
  const record = entry?.files?.find((file) => file.path === 'README.md');
  if (!entry || !record?.sha256) return { text: '', head: entry?.head ?? null, synced: false, state: 'absent' };
  const document = documents[`sources/${name}/README.md`];
  if (!document || typeof document !== 'object') return { text: '', head: entry.head, synced: false, state: 'unverified' };
  // The content pipeline verified the raw upstream bytes against the manifest
  // digest and recorded the result next to the text it stored. The stored text
  // carries the neutral-vocabulary mapping, so it is trusted through that
  // recorded result rather than hashed again against the upstream digest.
  const published = document.verified && document.safe && typeof document.text === 'string' ? document.text : '';
  return {
    text: published,
    head: entry.head,
    synced: document.verified,
    state: document.verified ? (document.safe ? 'published' : 'blocked') : 'unverified'
  };
}

/**
 * The card summary: the manifest's role for the seven systems, the first
 * paragraph of the synced README for the rest, and honest static copy when a
 * repository's own text is not published here.
 * @param {string} name
 * @param {string} kind
 * @param {{ text: string, state: string }} readme
 * @param {string | null} role
 * @returns {string}
 */
function summaryFor(name, kind, readme, role) {
  if (name === 'lattice') return 'The Vidoxlabs website: Vivarium, its systems, live status and docs.';
  if (kind === 'system') return role || (readme.text ? firstParagraph(readme.text) : 'A Vivarium system; read its documentation in the hub.');
  if (readme.text) return firstParagraph(readme.text);
  return fallbackSummaries[kind] ?? `${name} publishes its documentation through the documentation hub.`;
}

/**
 * The card badge, driven by documentation presence and freshness rather than
 * by whether the README text could be parsed: planned only when nothing from
 * the repository reached this site, specified when the docs lag the head.
 * @param {boolean} presence
 * @param {boolean | null} fresh
 * @returns {'observed' | 'specified' | 'planned'}
 */
function claimFor(presence, fresh) {
  if (!presence) return 'planned';
  if (fresh === false) return 'specified';
  return 'observed';
}

export function getCatalog() {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const { manifest, vivarium, pinsPending, status, sources, snapshot, docsPages } = pipeline;
      const repositories = await Promise.all(names.map(async (name) => {
        const readme = name === 'lattice' ? { text: '', head: null, synced: false, state: 'absent' } : await readSyncedReadme(manifest, name, pipeline.documents);
        const system = vivarium.systems?.find((entry) => entry.name === name);
        const docsEntry = manifest.sources?.[name];
        const readmeRecorded = Boolean(docsEntry?.files?.some((file) => file.path === 'README.md' && file.sha256));
        const hasPages = docsPages.some((page) => page.repo === name && page.kind !== 'placeholder');
        const current = status.repositories?.[name] ?? {
          ciConclusion: 'unknown',
          lastPushAt: null,
          openPrCount: null,
          latestRelease: null,
          docsFreshness: { syncedHead: docsEntry?.head ?? null, repositoryHead: null, fresh: null },
          testTotals: 'not published'
        };
        const presence = name === 'lattice' || readmeRecorded || hasPages;
        return {
          name,
          kind: kinds[name] ?? 'system',
          summary: summaryFor(name, kinds[name] ?? 'system', readme, system?.role ?? null),
          synced: presence,
          claim: claimFor(presence, current.docsFreshness.fresh),
          readmeState: readme.state,
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
      return { repositories, manifest, vivarium, pinsPending, status, sources, snapshot, docsPages, builtAt: pipeline.builtAt ?? null };
    })();
  }
  return catalogPromise;
}

export async function getRepository(name) {
  const catalog = await getCatalog();
  const repository = catalog.repositories.find((entry) => entry.name === name);
  if (!repository) return null;
  const readme = name === 'lattice' ? { text: '', head: null, synced: false, state: 'absent' } : await readSyncedReadme(catalog.manifest, name, pipeline.documents);
  return { ...repository, quickstart: firstCommandBlock(readme.text), readmeSynced: readme.synced, readmeState: readme.state };
}

export function sourceUrl(name, head, path = 'README.md') {
  return `https://github.com/Vidoxlabs/${name}/blob/${head ?? 'main'}/${path}`;
}
