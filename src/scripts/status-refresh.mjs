import { dateLabel } from '../lib/dates.mjs';

const states = new Set(['success', 'failure', 'in progress', 'no checks', 'unknown', 'cancelled', 'timed_out', 'action_required', 'startup_failure']);
let timer;

function renderField(field, value) {
  if (value === null || value === undefined) return;
  const key = field.getAttribute('data-status-field');
  if (key === 'lastPushAt') {
    const time = field.querySelector('time');
    if (time) {
      time.setAttribute('datetime', String(value));
      time.textContent = dateLabel(String(value), { withTime: true });
    } else {
      field.textContent = dateLabel(String(value), { withTime: true });
    }
  } else {
    field.textContent = String(value);
  }
  if (key === 'ci') field.setAttribute('data-ci', states.has(value) ? value : 'unknown');
}

function renderSource(element, live, buildAt) {
  const source = element.querySelector('[data-status-source]');
  if (!source) return;
  const fromBuild = Object.values(live.sources ?? {}).includes('build');
  if (!fromBuild) {
    source.textContent = `Live data, observed ${dateLabel(live.observedAt, { withTime: true })}`;
  } else {
    source.textContent = buildAt ? `Build data from ${dateLabel(buildAt)}` : 'Live data unavailable';
  }
}

async function refresh() {
  if (document.visibilityState !== 'visible') return;
  try {
    const response = await fetch('/api/status', { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const payload = await response.json();
    for (const element of document.querySelectorAll('[data-status-repository]')) {
      const name = element.getAttribute('data-status-repository');
      const current = payload.live?.repositories?.[name];
      if (!current) continue;
      for (const field of element.querySelectorAll('[data-status-field]')) {
        const key = field.getAttribute('data-status-field');
        renderField(field, key === 'ci' ? current.ciConclusion : current[key]);
      }
      renderSource(element, current, payload.buildAt);
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
