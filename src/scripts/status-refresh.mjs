const states = new Set(['success', 'failure', 'in progress', 'no checks', 'unknown', 'cancelled', 'timed_out', 'action_required', 'startup_failure']);
let timer;

async function refresh() {
  if (document.visibilityState !== 'visible') return;
  try {
    const response = await fetch('/api/status', { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const payload = await response.json();
    for (const element of document.querySelectorAll('[data-status-repository]')) {
      const name = element.getAttribute('data-status-repository');
      const current = payload.live?.repositories?.[name] ?? payload.repositories?.[name];
      if (!current) continue;
      for (const field of element.querySelectorAll('[data-status-field]')) {
        const key = field.getAttribute('data-status-field');
        const value = key === 'ci' ? current.ciConclusion : current[key];
        if (typeof value === 'string' || typeof value === 'number') field.textContent = String(value);
        if (key === 'ci') {
          field.setAttribute('data-ci', states.has(value) ? value : 'unknown');
        }
      }
    }
    document.documentElement.setAttribute('data-live-status', payload.live?.complete ? 'fresh' : 'degraded');
  } catch {
    document.documentElement.setAttribute('data-live-status', 'degraded');
  }
}

function start() {
  refresh();
  if (!timer) timer = globalThis.setInterval(refresh, 300000);
}

document.addEventListener('visibilitychange', start);
start();
