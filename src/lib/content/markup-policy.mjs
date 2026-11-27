/**
 * The one place that decides how an inline text alignment is expressed. Both
 * the string sanitizer over stored HTML and the rehype plugin that runs at
 * render time use it, so the two paths cannot disagree.
 *
 * @param {string} declaration an inline style declaration
 * @returns {'left' | 'start' | 'center' | 'right' | 'end' | null}
 */
export function alignmentFromStyle(declaration) {
  const match = /^\s*text-align\s*:\s*(left|start|center|right|end)\s*;?\s*$/i.exec(declaration ?? '');
  return match ? /** @type {'left'} */ (match[1].toLowerCase()) : null;
}
