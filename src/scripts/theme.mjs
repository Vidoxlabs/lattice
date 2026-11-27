const root = document.documentElement;
const themeToggle = document.querySelector('[data-theme-toggle]');
const motionToggle = document.querySelector('[data-motion-toggle]');
const motionLabel = document.querySelector('[data-motion-label]');

function applyTheme(theme) {
  root.dataset.theme = theme;
  if (!themeToggle) return;
  themeToggle.setAttribute('aria-pressed', String(theme === 'light'));
  themeToggle.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`);
  themeToggle.textContent = theme === 'light' ? 'Dark theme' : 'Light theme';
}

const saved = localStorage.getItem('lattice-theme');
applyTheme(saved === 'light' || saved === 'dark' ? saved : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
themeToggle?.addEventListener('click', () => {
  const theme = root.dataset.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('lattice-theme', theme);
  applyTheme(theme);
});

function applyMotion(paused) {
  root.dataset.motion = paused ? 'paused' : 'running';
  motionToggle?.setAttribute('aria-pressed', String(paused));
  if (motionLabel) motionLabel.textContent = paused ? 'Resume background motion' : 'Pause background motion';
}

applyMotion(matchMedia('(prefers-reduced-motion: reduce)').matches || sessionStorage.getItem('lattice-motion') === 'paused');
motionToggle?.addEventListener('click', () => {
  const paused = root.dataset.motion !== 'paused';
  sessionStorage.setItem('lattice-motion', paused ? 'paused' : 'running');
  applyMotion(paused);
});

const menu = document.querySelector('[data-menu-toggle]');
const sheet = document.querySelector('#site-nav-sheet');
const close = document.querySelector('[data-menu-close]');
const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function setMenu(open) {
  if (!(sheet instanceof HTMLElement)) return;
  sheet.hidden = !open;
  root.dataset.navigation = open ? 'open' : 'closed';
  menu?.setAttribute('aria-expanded', String(open));
  if (open && close instanceof HTMLElement) close.focus();
  else if (menu instanceof HTMLElement) menu.focus();
}

menu?.addEventListener('click', () => setMenu(sheet instanceof HTMLElement && sheet.hidden));
close?.addEventListener('click', () => setMenu(false));
sheet?.addEventListener('click', event => {
  if (event.target === sheet || (event.target instanceof Element && event.target.closest('a'))) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (!(sheet instanceof HTMLElement) || sheet.hidden) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    setMenu(false);
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = [...sheet.querySelectorAll(focusableSelector)].filter(element => element instanceof HTMLElement && element.offsetParent !== null);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    if (last instanceof HTMLElement) last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    if (first instanceof HTMLElement) first.focus();
  }
});
