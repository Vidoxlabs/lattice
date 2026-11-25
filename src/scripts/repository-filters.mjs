const buttons = document.querySelectorAll('[data-repository-filter]');
const cards = document.querySelectorAll('[data-repository-kind]');
for (const button of buttons) {
  button.addEventListener('click', () => {
    const kind = button.getAttribute('data-repository-filter');
    for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
    for (const card of cards) {
      if (card instanceof HTMLElement) card.hidden = kind !== 'all' && card.getAttribute('data-repository-kind') !== kind;
    }
  });
}
