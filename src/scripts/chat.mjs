const DEFAULT_ASSISTANT = 'Vidoxlabs assistant';
const surfaces = [...document.querySelectorAll('[data-chat-surface]')];

function escapeText(value) {
  return String(value ?? '');
}

/**
 * Render one server-sent event into the conversation log. Tokens append to
 * the active reply; other events update state around it.
 */
function applyEvent(log, state, type, data) {
  if (type === 'session' && data.assistant) {
    state.assistant = data.assistant;
    for (const element of document.querySelectorAll('[data-chat-assistant]')) {
      element.textContent = data.assistant;
    }
  }
  if (type === 'tool') {
    const card = document.createElement('article');
    card.className = 'lattice-chat-tool';
    card.setAttribute('data-videsign', 'tool-call-trace-card');
    card.textContent = `${data.id} · ${data.ok ? data.summary : data.error}`;
    log.append(card);
  }
  if (type === 'citations' && Array.isArray(data.sources) && data.sources.length) {
    const list = document.createElement('details');
    list.className = 'lattice-chat-citations';
    list.setAttribute('data-videsign', 'inline-citation-popover');
    const summary = document.createElement('summary');
    summary.textContent = `Cited sources (${data.sources.length})`;
    list.append(summary);
    for (const source of data.sources) {
      const link = document.createElement('a');
      link.href = source.originRef;
      link.textContent = source.title;
      const item = document.createElement('li');
      item.append(link);
      const holder = document.createElement('ul');
      holder.append(item);
      list.append(holder);
    }
    log.append(list);
  }
  if (type === 'token') {
    if (!state.reply) {
      state.reply = document.createElement('p');
      state.reply.className = 'lattice-chat-reply';
      state.reply.setAttribute('data-videsign', 'turn-state-chip');
      state.reply.setAttribute('data-turn-state', 'streaming');
      log.append(state.reply);
    }
    state.reply.textContent += escapeText(data.text);
  }
  if (type === 'done') {
    if (state.reply) state.reply.setAttribute('data-turn-state', data.ok ? 'complete' : 'failed');
    state.reply = null;
  }
  if (type === 'error' || type === 'notice') {
    const note = document.createElement('p');
    note.className = 'lattice-chat-note';
    note.textContent = escapeText(data.text);
    log.append(note);
  }
}

async function ask(surface, log, question, state) {
  const bubble = document.createElement('p');
  bubble.className = 'lattice-chat-visitor';
  bubble.textContent = question;
  log.append(bubble);
  for (const element of surface.querySelectorAll('[data-chat-starter]')) {
    element.closest('li')?.remove();
  }
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'visitor', content: question }] })
  });
  if (!response.ok || !response.body) {
    const note = document.createElement('p');
    note.className = 'lattice-chat-note';
    note.textContent = `The chat endpoint answered ${response.status}. Try again in a moment.`;
    log.append(note);
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      let type = 'message';
      const payload = { data: '' };
      for (const line of frame.split('\n')) {
        const colon = line.indexOf(':');
        if (colon === -1) continue;
        const name = line.slice(0, colon).trim();
        const content = line.slice(colon + 1).trim();
        if (name === 'event') type = content;
        if (name === 'data') payload.data = content;
      }
      try {
        applyEvent(log, state, type, JSON.parse(payload.data));
      } catch {
        // A malformed frame ends this reply; the log keeps what rendered.
      }
    }
  }
}

for (const surface of surfaces) {
  const log = surface.querySelector('[data-chat-log], .lattice-chat-log');
  const form = /** @type {HTMLFormElement} */ (surface.querySelector('[data-chat-form]'));
  if (!log || !form) continue;
  const state = { assistant: DEFAULT_ASSISTANT, reply: null };
  const input = /** @type {HTMLInputElement} */ (form.querySelector('[data-chat-input]'));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question || state.busy) return;
    state.busy = true;
    input.value = '';
    try {
      await ask(surface, log, question, state);
    } finally {
      state.busy = false;
      input.focus();
    }
  });
  for (const starter of surface.querySelectorAll('[data-chat-starter]')) {
    starter.addEventListener('click', () => {
      input.value = starter.getAttribute('data-chat-starter') ?? '';
      form.requestSubmit();
    });
  }
}

const launcher = /** @type {HTMLButtonElement} */ (document.querySelector('[data-chat-launcher]'));
const dock = /** @type {HTMLElement} */ (document.querySelector('#chat-dock[data-chat-surface="dock"]'));

/** Close the dialog and hand focus back to the control that opened it. */
function closeDock() {
  if (!dock || dock.hidden) return;
  dock.hidden = true;
  launcher?.setAttribute('aria-expanded', 'false');
  launcher?.focus();
}

if (launcher && dock) {
  launcher.addEventListener('click', () => {
    const open = !dock.hidden;
    dock.hidden = open;
    launcher.setAttribute('aria-expanded', String(!open));
    if (!open) /** @type {HTMLInputElement} */ (dock.querySelector('[data-chat-input]'))?.focus();
  });
  for (const close of document.querySelectorAll('[data-chat-close]')) {
    close.addEventListener('click', closeDock);
  }
  dock.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeDock();
  });
}

// A link may prefill a question, for example from a documentation page.
const asked = new URLSearchParams(window.location.search).get('q');
if (asked) {
  for (const input of document.querySelectorAll('[data-chat-input]')) {
    if (input instanceof HTMLInputElement) input.value = asked;
  }
  const dockInput = dock && !dock.hidden ? /** @type {HTMLInputElement} */ (dock.querySelector('[data-chat-input]')) : null;
  if (dockInput) dockInput.focus();
}
