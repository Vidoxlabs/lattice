// Wrap each rendered code block in a positioned frame and add a copy button.
// The button carries a class only: no inline style, so the policy stands.

for (const pre of document.querySelectorAll('.lattice-prose pre')) {
  const code = pre.querySelector('code');
  if (!code || pre.closest('.code-block')) continue;
  const frame = document.createElement('div');
  frame.className = 'code-block';
  pre.replaceWith(frame);
  frame.append(pre);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'code-copy';
  button.textContent = 'Copy';
  button.setAttribute('aria-label', 'Copy this code block');
  frame.append(button);
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.textContent);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Copy failed';
    }
    window.setTimeout(() => { button.textContent = 'Copy'; }, 3000);
  });
}
