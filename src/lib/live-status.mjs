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

async function getJson(fetchImpl, url, token) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'Vidoxlabs-lattice' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetchImpl(url, { headers });
  if (!response.ok) throw new Error(`Public status returned ${response.status}`);
  return response.json();
}

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
