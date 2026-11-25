const API = 'https://api.github.com/repos/Vidoxlabs';

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
 * @property {() => Promise<any>} json
 */

/**
 * Minimal fetch signature so tests can stub responses.
 * @typedef {(url: string, init?: { headers: Record<string, string> }) => Promise<FetchLikeResponse>} FetchLike
 */

async function getJson(/** @type {FetchLike} */ fetchImpl, /** @type {string} */ url, /** @type {string} */ token) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'Vidoxlabs-lattice' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetchImpl(url, { headers });
  if (!response.ok) throw new Error(`Public status returned ${response.status}`);
  return response.json();
}

/**
 * Refresh only the live fields (head, CI conclusion, last push) of the
 * build-time status from the public GitHub REST API. Degrades to the
 * build-time values on any error.
 * @param {any} buildStatus
 * @param {{ fetchImpl?: FetchLike, token?: string, now?: () => Date }} [options]
 */
export async function refreshLiveFields(buildStatus, { fetchImpl = fetch, token = '', now = () => new Date() } = {}) {
  const entries = await Promise.all(Object.keys(buildStatus.repositories).map(async (name) => {
    const previous = buildStatus.repositories[name];
    try {
      const [repository, branch] = await Promise.all([
        getJson(fetchImpl, `${API}/${name}`, token),
        getJson(fetchImpl, `${API}/${name}/branches/main`, token)
      ]);
      const head = branch.commit?.sha ?? previous.head;
      let ciConclusion = previous.ciConclusion;
      if (head) {
        try {
          const checks = await getJson(fetchImpl, `${API}/${name}/commits/${head}/check-runs`, token);
          ciConclusion = ciSummary(checks.check_runs);
        } catch {
          ciConclusion = previous.ciConclusion;
        }
      }
      return [name, { head: previous.head, ciConclusion, lastPushAt: repository.pushed_at ?? previous.lastPushAt, fresh: true }];
    } catch {
      return [name, { head: previous.head, ciConclusion: previous.ciConclusion, lastPushAt: previous.lastPushAt, fresh: false }];
    }
  }));
  const repositories = Object.fromEntries(entries);
  return {
    observedAt: now().toISOString(),
    complete: Object.values(repositories).every((value) => value.fresh),
    repositories
  };
}
