/**
 * Strip interactive and form markup from rendered documentation HTML before it
 * reaches a page. The markdown renderer already escapes code samples, so this
 * pass only has to remove any raw markup a source may carry. It is a
 * defense-in-depth layer: fetched sources are digest-verified and
 * public-safety-scanned before they ever reach the renderer.
 *
 * @param {string} html
 * @returns {string}
 */
export function sanitizeRenderedHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*\/>/gi, '')
    .replace(/<\/?(?:iframe|object|embed|form|input|button|select|textarea|template|link|meta)\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Turn leading claim-status lines into labelled badges, preserving the label
 * text. Only the family's claim vocabulary is recognized; anything else stays
 * as written.
 *
 * @param {string} html
 * @returns {string}
 */
export function badgeClaimLines(html) {
  return html.replace(/<p>\s*Status:\s*<code>([a-z-]+)<\/code>/gi, (whole, label) =>
    ['implemented', 'specified', 'planned', 'observed'].includes(label)
      ? `<p class="lattice-claim-line">Status: <span class="lattice-claim-badge" data-claim="${label}">${label}</span></p>`
      : whole);
}
