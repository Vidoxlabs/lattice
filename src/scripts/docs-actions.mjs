// Copy the rendered page text or its address, with a polite status receipt.
// External module, no inline handlers, so the content security policy holds.

const status = document.querySelector('[data-docs-copy-status]');

function announce(message) {
  if (!status) return;
  status.textContent = message;
  window.setTimeout(() => { status.textContent = ''; }, 4000);
}

async function copy(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    announce(message);
  } catch {
    announce('Copy is unavailable in this browser. Select the text instead.');
  }
}

document.querySelector('[data-docs-copy-page]')?.addEventListener('click', () => {
  const article = document.querySelector('[data-docs-article]');
  if (article) copy(article.textContent.replace(/\n{3,}/g, '\n\n').trim(), 'Page text copied.');
});

document.querySelector('[data-docs-copy-link]')?.addEventListener('click', () => {
  copy(window.location.href, 'Link copied.');
});
