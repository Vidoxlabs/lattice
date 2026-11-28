const API = 'https://api.github.com/repos/Vidoxlabs';
const GRAPHQL = 'https://api.github.com/graphql';

export function ciSummary(checkRuns) {
  if (!checkRuns?.length) return 'no checks';
  if (checkRuns.some((run) => run.status !== 'completed')) return 'in progress';
  const conclusions = new Set(checkRuns.map((run) => run.conclusion ?? 'unknown'));
  for (const conclusion of ['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure']) {
    if (conclusions.has(conclusion)) return conclusion;
  }
  if (conclusions.has('success')) return 'success';
  return [...conclusions].sort().join(', ');
}

/**
 * @typedef {object} FetchLikeResponse
 * @property {boolean} ok
 * @property {number} status
 * @property {{ get(name: string): string | null }} headers
 * @property {() => Promise<any>} json
 */

/**
 * Minimal fetch signature so tests can stub responses.
 * @typedef {(url: string, init?: { headers?: Record<string, string>, method?: string, body?: string }) => Promise<FetchLikeResponse>} FetchLike
 */

async function getJson(/** @type {FetchLike} */ fetchImpl, /** @type {string} */ url, /** @type {string} */ token) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'Vidoxlabs-lattice' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetchImpl(url, { headers });
  if (!response.ok) throw new Error(`Public status returned ${response.status}`);
  return response.json();
}

async function postJson(/** @type {FetchLike} */ fetchImpl, /** @type {string} */ url, /** @type {string} */ token, body) {
  const response = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body });
  if (!response.ok) throw new Error(`Public status returned ${response.status}`);
  return response.json();
}

/** The fields a refresh can carry live, each labelled with where it came from. */
const liveFields = ['head', 'ciConclusion', 'lastPushAt', 'openPrCount'];

/**
 * Merge one repository's live fetch onto its build-time values. A field the
 * fetch did not carry keeps the build value and is labelled 'build', so no
 * reader can mistake a build-time number for a live one.
 * @param {any} previous the build-time repository status
 * @param {any} fetched the live fetch result, or null when it failed
 * @returns {{ head: string | null, ciConclusion: string, lastPushAt: string | null, openPrCount: number | null, fresh: boolean, sources: Record<string, string> }}
 */
function mergeLive(previous, fetched) {
  const merged = { head: previous.head ?? null, ciConclusion: previous.ciConclusion, lastPushAt: previous.lastPushAt ?? null, openPrCount: previous.openPrCount ?? null };
  const sources = Object.fromEntries(liveFields.map((field) => [field, 'build']));
  if (!fetched) return { ...merged, fresh: false, sources };
  for (const field of liveFields) {
    if (fetched[field] !== undefined && fetched[field] !== null) {
      merged[field] = fetched[field];
      sources[field] = 'live';
    }
  }
  return { ...merged, fresh: Boolean(fetched.fresh), sources };
}

/**
 * Refresh the live fields (head, CI conclusion, last push, open pull requests)
 * of the build-time status from the public GitHub API, one GraphQL query when a
 * read token exists and one REST call per repository otherwise, with the
 * head and its check runs fetched only for repositories whose push time moved
 * since the build. Every field keeps a per-field source label, and a failed
 * fetch keeps the build value labelled 'build'.
 *
 * @param {any} buildStatus
 * @param {{ fetchImpl?: FetchLike, token?: string, now?: () => Date }} [options]
 */
export async function refreshLiveFields(buildStatus, { fetchImpl = fetch, token = '', now = () => new Date() } = {}) {
  const names = Object.keys(buildStatus.repositories);
  const fetched = token
    ? await refreshThroughGraphql(fetchImpl, token, names)
    : await refreshThroughRest(fetchImpl, buildStatus, names);
  const repositories = Object.fromEntries(names.map((name) => [name, mergeLive(buildStatus.repositories[name], fetched[name] ?? null)]));
  return {
    observedAt: now().toISOString(),
    complete: names.every((name) => repositories[name].fresh),
    repositories
  };
}

/**
 * One GraphQL query for every repository: the head commit with its push time
 * and check rollup, and the count of open pull requests. A query that fails
 * leaves every repository on its build values.
 * @param {FetchLike} fetchImpl
 * @param {string} token
 * @param {string[]} names
 */
async function refreshThroughGraphql(fetchImpl, token, names) {
  const selections = names.map((name, index) => `r${index}: repository(owner: "Vidoxlabs", name: "${name}") { defaultBranchRef { target { ... on Commit { oid pushedDate checkSuites(first: 100) { nodes { checkRuns(first: 100) { nodes { status conclusion } } } } } } } pullRequests(states: OPEN) { totalCount } }`);
  try {
    const result = await postJson(fetchImpl, GRAPHQL, token, JSON.stringify({ query: `query LiveStatus { ${selections.join(' ')} }` }));
    return Object.fromEntries(names.map((name, index) => {
      const node = result?.data?.[`r${index}`];
      const head = node?.defaultBranchRef?.target?.oid ?? null;
      const checkRuns = node?.defaultBranchRef?.target?.checkSuites?.nodes?.flatMap((suite) => suite.checkRuns?.nodes ?? []) ?? [];
      return [name, {
        head,
        lastPushAt: node?.defaultBranchRef?.target?.pushedDate ?? null,
        ciConclusion: head ? ciSummary(checkRuns) : undefined,
        openPrCount: node?.pullRequests?.totalCount ?? null,
        fresh: Boolean(head)
      }];
    }));
  } catch {
    return Object.fromEntries(names.map((name) => [name, null]));
  }
}

/**
 * One REST call per repository for its push time; the head, its check runs and
 * the open pull requests are fetched only for repositories whose push time
 * moved since the build, and the check runs only when the head itself moved:
 * a repository whose head never changed keeps the check conclusion the build
 * already recorded.
 * @param {FetchLike} fetchImpl
 * @param {any} buildStatus
 * @param {string[]} names
 */
async function refreshThroughRest(fetchImpl, buildStatus, names) {
  return Object.fromEntries(await Promise.all(names.map(async (name) => {
    const previous = buildStatus.repositories[name];
    try {
      const repository = await getJson(fetchImpl, `${API}/${name}`, '');
      const lastPushAt = typeof repository.pushed_at === 'string' ? repository.pushed_at : null;
      const moved = Boolean(lastPushAt) && lastPushAt !== previous.lastPushAt;
      if (!moved) return [name, { lastPushAt, fresh: true }];
      const fetched = { lastPushAt, fresh: false };
      try {
        const branch = await getJson(fetchImpl, `${API}/${name}/branches/main`, '');
        const head = branch.commit?.sha ?? null;
        if (head) {
          fetched.head = head;
          fetched.fresh = true;
          if (head !== previous.head) {
            try {
              const checks = await getJson(fetchImpl, `${API}/${name}/commits/${head}/check-runs`, '');
              fetched.ciConclusion = ciSummary(checks.check_runs);
            } catch {
              // The head is live; its check conclusion stays the build value.
            }
          }
        }
      } catch {
        // The head stays the build value and the repository is not fresh.
      }
      try {
        const pulls = await fetchImpl(`${API}/${name}/pulls?state=open&per_page=1`, { headers: { Accept: 'application/vnd.github+json' } });
        if (pulls.ok) {
          const list = await pulls.json();
          const link = pulls.headers.get('link') ?? '';
          const last = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
          fetched.openPrCount = last ? Number(last[1]) : Array.isArray(list) ? list.length : null;
        }
      } catch {
        // The count stays the build value.
      }
      return [name, fetched];
    } catch {
      return [name, null];
    }
  })));
}

/**
 * The cache a status response may ask for: a complete refresh keeps the
 * five-minute window, a degraded one carries build-labelled values and asks
 * for one minute at the edge and in the browser.
 * @param {boolean} complete
 * @returns {number}
 */
export function statusCacheSeconds(complete) {
  return complete ? 300 : 60;
}
