import { createHash } from 'node:crypto';
import { isPublicContentSafe } from '../content-safety.mjs';
import { ciSummary } from '../live-status.mjs';
import { collectDocsCorpus, verifiedAgainstRecord } from './docs-corpus.mjs';
import { neutralize } from './neutral-vocabulary.mjs';
import { stable, validateManifest, validateStatus } from './schema.mjs';

const API = 'https://api.github.com/repos/Vidoxlabs';
const DOCS_RAW = 'https://raw.githubusercontent.com/Vidoxlabs/docs/main';
const VIVARIUM_RAW = 'https://raw.githubusercontent.com/Vidoxlabs/vivarium/main/vivarium.json';
const ADDITIONAL_REPOSITORIES = ['docs', 'lattice'];

function headers(token) {
  const result = { Accept: 'application/vnd.github+json', 'User-Agent': 'Vidoxlabs-lattice' };
  if (token) result.Authorization = `Bearer ${token}`;
  return result;
}

/**
 * @typedef {object} FetchLikeResponse
 * @property {boolean} ok
 * @property {number} status
 * @property {{ get(name: string): string | null }} headers
 * @property {() => Promise<any>} json
 * @property {() => Promise<string>} text
 */

/**
 * Minimal fetch signature shared by the pipeline so tests can stub responses.
 * The second argument is the standard request init carrying the token header.
 * @typedef {(url: string, init?: { headers: Record<string, string> }) => Promise<FetchLikeResponse>} FetchLike
 */

async function request(/** @type {FetchLike} */ fetchImpl, /** @type {string} */ url, /** @type {string} */ token = '') {
  const response = await fetchImpl(url, { headers: headers(token) });
  if (!response.ok) throw new Error(`Public data returned ${response.status}`);
  return response;
}

async function json(/** @type {FetchLike} */ fetchImpl, /** @type {string} */ url, /** @type {string} */ token = '') {
  const response = await request(fetchImpl, url, token);
  return { value: await response.json(), response };
}

async function optional(/** @type {FetchLike} */ fetchImpl, /** @type {string} */ url, /** @type {string} */ token = '') {
  try {
    return await json(fetchImpl, url, token);
  } catch {
    return null;
  }
}

function parseCount(result) {
  if (!result || !Array.isArray(result.value)) return null;
  const link = result.response.headers.get('link') ?? '';
  const match = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
  return match ? Number(match[1]) : result.value.length;
}

function unknown(base, fields) {
  return { ...base, unknownFields: [...new Set([...base.unknownFields, ...fields])].sort() };
}

export async function gatherRepositoryStatus(/** @type {FetchLike} */ fetchImpl, /** @type {string} */ name, /** @type {any} */ manifest, /** @type {string} */ token = '') {
  const docsHead = manifest.sources?.[name]?.head ?? null;
  let value = {
    head: null,
    lastPushAt: null,
    ciConclusion: 'unknown',
    openPrCount: null,
    latestRelease: null,
    packageVersion: null,
    docsFreshness: { syncedHead: docsHead, repositoryHead: null, fresh: null },
    testTotals: 'not published',
    unknownFields: []
  };
  const [repository, branch, packageJson] = await Promise.all([
    optional(fetchImpl, `${API}/${name}`, token),
    optional(fetchImpl, `${API}/${name}/branches/main`, token),
    optional(fetchImpl, `https://raw.githubusercontent.com/Vidoxlabs/${name}/main/package.json`)
  ]);
  if (repository?.value?.pushed_at) value.lastPushAt = repository.value.pushed_at;
  else value = unknown(value, ['lastPushAt']);
  const head = branch?.value?.commit?.sha ?? null;
  if (head) {
    value.head = head;
    value.docsFreshness = {
      syncedHead: docsHead,
      repositoryHead: head,
      fresh: docsHead ? docsHead === head : null
    };
  } else value = unknown(value, ['head', 'docsFreshness']);
  if (packageJson?.value?.version) value.packageVersion = packageJson.value.version;
  else value = unknown(value, ['packageVersion']);

  const [checks, pulls, release] = await Promise.all([
    head ? optional(fetchImpl, `${API}/${name}/commits/${head}/check-runs`, token) : null,
    optional(fetchImpl, `${API}/${name}/pulls?state=open&per_page=100`, token),
    optional(fetchImpl, `${API}/${name}/releases/latest`, token)
  ]);
  if (checks) value.ciConclusion = ciSummary(checks.value.check_runs);
  else value = unknown(value, ['ciConclusion']);
  const count = parseCount(pulls);
  if (count === null) value = unknown(value, ['openPrCount']);
  else value.openPrCount = count;
  if (release?.value?.tag_name) value.latestRelease = release.value.tag_name;
  else {
    const tags = await optional(fetchImpl, `${API}/${name}/tags?per_page=1`, token);
    if (tags?.value?.[0]?.name) value.latestRelease = tags.value[0].name;
    else if (tags && release?.response?.status === 404) value.latestRelease = 'none published';
    else value = unknown(value, ['latestRelease']);
  }
  return value;
}

export async function gatherSiteStatus(/** @type {FetchLike} */ fetchImpl, manifest, vivarium, /** @type {string} */ token = '') {
  const names = [...new Set([...Object.keys(manifest.sources ?? {}), ...ADDITIONAL_REPOSITORIES])].sort();
  const entries = await Promise.all(names.map(async (name) => [name, await gatherRepositoryStatus(fetchImpl, name, manifest, token)]));
  const repositories = Object.fromEntries(entries);
  const systems = Object.fromEntries((vivarium.systems ?? []).map((system) => {
    const head = repositories[system.name]?.head ?? null;
    return [system.name, {
      pinnedCommit: system.commit ?? null,
      repositoryHead: head,
      drift: system.commit && head ? system.commit !== head : null
    }];
  }));
  return validateStatus(stable({
    version: 1,
    gatheredBy: 'site',
    repositories,
    vivarium: { pinsPending: !vivarium.systems?.length, systems }
  }));
}

async function collectDocuments(/** @type {FetchLike} */ fetchImpl, manifest, snapshotDocuments = {}, snapshotManifest = null) {
  const entries = [];
  const storedRecords = new Map();
  for (const [name, source] of Object.entries(snapshotManifest?.sources ?? {})) {
    for (const record of source.files ?? []) storedRecords.set(`${source.name ?? name}\u0000${record.path}`, record);
  }
  for (const [name, source] of Object.entries(manifest.sources ?? {})) {
    const record = source.files?.find((file) => file.path === 'README.md');
    if (!record?.sha256) continue;
    const path = `sources/${name}/README.md`;
    // A snapshot written before the recorded results carried plain strings;
    // a later one carries the result next to the text.
    const fallback = snapshotDocuments[path];
    const fallbackText = typeof fallback === 'string' ? fallback : fallback?.text ?? null;
    let text = null;
    let fromSnapshot = false;
    try {
      text = await (await request(fetchImpl, `${DOCS_RAW}/${path}`)).text();
    } catch {
      text = fallbackText;
      fromSnapshot = true;
    }
    if (typeof text !== 'string') continue;
    // The fetched text verifies against the upstream digest; a snapshot text
    // carries the site's mapping and verifies against the stored digest the
    // snapshot recorded, only while its upstream digest still matches.
    const storedRecord = fromSnapshot ? storedRecords.get(`${name}\u0000${record.path}`) : undefined;
    const verified = verifiedAgainstRecord(text, record, storedRecord);
    const safe = verified && isPublicContentSafe(text, `${name}/${record.path}`);
    // The raw upstream bytes are hashed here and only here. The stored text
    // carries the neutral mapping, so it can never re-verify against the
    // upstream digest; every later reader trusts the result recorded beside
    // it instead of hashing the mapped text again.
    entries.push([path, { text: safe ? neutralize(text) : null, verified, safe }]);
  }
  return Object.fromEntries(entries);
}

/**
 * Collect everything the site renders from: the documentation manifest, the
 * corpus, the public repository status and the Vivarium pins. The fetch
 * implementation is the standard one; tests stub it with the FetchLike shape.
 *
 * @param {{ fetchImpl?: FetchLike, token?: string, snapshot?: any, allowSnapshot?: boolean }} [options]
 */
export async function collectPipeline({ fetchImpl = fetch, token = '', snapshot = null, allowSnapshot = true } = {}) {
  const fallback = allowSnapshot ? snapshot : null;
  let manifest;
  let manifestSource = 'docs';
  try {
    manifest = validateManifest((await json(fetchImpl, `${DOCS_RAW}/manifest.json`)).value);
  } catch (error) {
    if (!fallback?.manifest) throw error;
    manifest = validateManifest(fallback.manifest);
    manifestSource = 'snapshot';
  }

  let vivarium = { systems: [] };
  let vivariumSource = 'vivarium';
  try {
    const candidate = (await json(fetchImpl, VIVARIUM_RAW)).value;
    if (!Array.isArray(candidate.systems)) throw new Error('Vivarium manifest has no systems array');
    vivarium = candidate;
  } catch {
    if (fallback?.vivarium) {
      vivarium = fallback.vivarium;
      vivariumSource = 'snapshot';
    }
  }

  // The documentation corpus is gathered before the live status: the corpus
  // needs one API call (the hub tree) while the status gather consumes most of
  // an unauthenticated rate window, so this order keeps the corpus complete
  // even when the status degrades to the snapshot.
  const documents = await collectDocuments(fetchImpl, manifest, fallback?.documents, fallback?.manifest ?? null);
  const docsPages = await collectDocsCorpus(fetchImpl, manifest, token, fallback?.docsPages ?? [], fallback?.manifest ?? null);

  let status;
  let statusError = null;
  try {
    const candidate = (await json(fetchImpl, `${DOCS_RAW}/status.json`)).value;
    status = validateStatus(stable({ ...candidate, gatheredBy: 'docs' }));
  } catch (error) {
    statusError = error.message;
    try {
      status = await gatherSiteStatus(fetchImpl, manifest, vivarium, token);
      if (fallback?.status && Object.values(status.repositories).every((repository) => !repository.head)) {
        status = validateStatus(stable({ ...fallback.status, gatheredBy: 'snapshot' }));
      }
    } catch (siteError) {
      if (!fallback?.status) throw siteError;
      status = validateStatus(stable({ ...fallback.status, gatheredBy: 'snapshot' }));
    }
  }

  const docsIndex = {
    generatedAt: manifest.generatedAt ?? null,
    pages: docsPages
      .filter((page) => page.kind !== 'placeholder')
      .map((page) => ({ slug: page.slug, title: page.title, repo: page.repo, head: page.head, sourcePath: page.sourcePath, headings: page.headings, chunks: chunkText(page.body) }))
  };
  const snapshotUsed = manifestSource === 'snapshot' || status.gatheredBy === 'snapshot';
  return stable({
    manifest,
    status,
    vivarium,
    documents,
    docsPages,
    docsIndex,
    pinsPending: !vivarium.systems?.length,
    sources: { manifest: manifestSource, status: status.gatheredBy, vivarium: vivariumSource },
    snapshot: { used: snapshotUsed, capturedAt: snapshotUsed ? fallback?.capturedAt ?? null : null },
    warnings: statusError ? ['Documentation status is unavailable; the labelled fallback was used.'] : []
  });
}

const SEARCH_CHUNK_LIMIT = 1500;

/**
 * Split a section into parts that never cut a fenced code block in half: a
 * fenced block is one part, kept whole however long it is, so every chunk the
 * search index stores still carries balanced fences and later prose checks
 * can strip code reliably.
 * @param {string} text
 * @returns {string[]}
 */
function fenceParts(text) {
  const parts = [];
  let start = 0;
  let open = null;
  for (const match of text.matchAll(/```/g)) {
    if (open === null) {
      if (match.index > start) parts.push(text.slice(start, match.index));
      open = match.index;
    } else {
      parts.push(text.slice(open, match.index + 3));
      start = match.index + 3;
      open = null;
    }
  }
  parts.push(text.slice(start));
  return parts.filter((part) => part.length > 0);
}

/**
 * Split a document body into deterministic chunks for the search index. A
 * fenced code block is never sliced: its chunk may exceed the limit rather
 * than leave an unbalanced fence behind in the stored text.
 * @param {string} body
 * @returns {{ id: number, text: string }[]}
 */
export function chunkText(body) {
  const sections = body.split(/^##\s+/m).filter((section) => section.trim());
  const chunks = [];
  for (const section of sections) {
    const [heading, ...rest] = section.split('\n');
    const text = `${heading.trim()}\n${rest.join('\n').trim()}`;
    for (const part of fenceParts(text)) {
      const fenced = part.startsWith('```');
      if (fenced) {
        chunks.push({ id: chunks.length, text: part });
        continue;
      }
      const last = chunks[chunks.length - 1];
      if (last && !last.text.startsWith('```') && last.text.length + part.length <= SEARCH_CHUNK_LIMIT) {
        last.text += part;
        continue;
      }
      for (let offset = 0; offset < part.length; offset += SEARCH_CHUNK_LIMIT) {
        chunks.push({ id: chunks.length, text: part.slice(offset, offset + SEARCH_CHUNK_LIMIT) });
      }
    }
  }
  return chunks.length ? chunks : [{ id: 0, text: body.slice(0, SEARCH_CHUNK_LIMIT) }];
}
