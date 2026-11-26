const form = document.querySelector('[data-repository-filters]');
const search = /** @type {HTMLInputElement | null} */ (document.querySelector('[data-repository-search-input]'));
const kind = /** @type {HTMLSelectElement | null} */ (document.querySelector('[data-repository-filter]'));
const cards = [...document.querySelectorAll('[data-repository-kind]')];
const count = document.querySelector('[data-repository-count]');
const empty = document.querySelector('[data-repository-empty]');

function applyFilters() {
  const query = search?.value.trim().toLowerCase() ?? '';
  const selectedKind = kind?.value ?? 'all';
  let visible = 0;
  for (const card of cards) {
    const matchesKind = selectedKind === 'all' || card.getAttribute('data-repository-kind') === selectedKind;
    const matchesQuery = !query || card.getAttribute('data-repository-search')?.includes(query);
    const show = matchesKind && matchesQuery;
    card.classList.toggle('hidden', !show);
    card.toggleAttribute('hidden', !show);
    if (show) visible += 1;
  }
  if (count) count.textContent = `Showing ${visible} of ${cards.length} repositories`;
  empty?.classList.toggle('hidden', visible !== 0);
  empty?.toggleAttribute('hidden', visible !== 0);
}

form?.addEventListener('submit', (event) => event.preventDefault());
search?.addEventListener('input', applyFilters);
kind?.addEventListener('change', applyFilters);
form?.addEventListener('reset', () => requestAnimationFrame(applyFilters));
/** @type {HTMLButtonElement | null} */ (document.querySelector('[data-repository-empty-reset]'))?.addEventListener('click', () => {
  if (search) search.value = '';
  if (kind) kind.value = 'all';
  applyFilters();
  search?.focus();
});
