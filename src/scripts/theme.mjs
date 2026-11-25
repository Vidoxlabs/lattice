const root = document.documentElement;
const toggle = document.querySelector('[data-theme-toggle]');
const motion = document.querySelector('[data-motion-toggle]');

function applyTheme(theme) {
  root.dataset.theme = theme;
  toggle?.setAttribute('aria-pressed', String(theme === 'light'));
  toggle?.setAttribute('aria-label', `Use ${theme === 'light' ? 'dark' : 'light'} theme`);
}

const saved = localStorage.getItem('lattice-theme');
applyTheme(saved === 'light' || saved === 'dark' ? saved : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
toggle?.addEventListener('click', () => {
  const theme = root.dataset.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('lattice-theme', theme);
  applyTheme(theme);
});

motion?.addEventListener('click', () => {
  const paused = root.dataset.motion === 'paused';
  root.dataset.motion = paused ? 'running' : 'paused';
  motion.setAttribute('aria-pressed', String(!paused));
  motion.textContent = paused ? 'Pause background motion' : 'Resume background motion';
});

if (matchMedia('(prefers-reduced-motion: reduce)').matches) root.dataset.motion = 'paused';

const menu = document.querySelector('[data-menu-toggle]');
const sheet = document.querySelector('#site-nav-sheet');
const close = document.querySelector('[data-menu-close]');
function setMenu(open) {
  if (!(sheet instanceof HTMLElement)) return;
  sheet.hidden = !open;
  menu?.setAttribute('aria-expanded', String(open));
  if (open && close instanceof HTMLElement) close.focus();
  else if (menu instanceof HTMLElement) menu.focus();
}
menu?.addEventListener('click', () => setMenu(sheet instanceof HTMLElement && sheet.hidden));
close?.addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenu(false);
});
