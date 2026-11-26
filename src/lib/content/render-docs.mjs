/**
 * Bumped whenever this module changes what a page looks like. The content layer
 * keys its store by the entry digest, so without the revision a cached page
 * would survive a renderer change and the build would publish the old markup.
 */
export const RENDER_REVISION = 5;

/**
 * Strip interactive and form markup from rendered documentation HTML before it
 * reaches a page. The markdown renderer already escapes code samples, so this
 * pass only has to remove any raw markup a source may carry. It is a
 * defense-in-depth layer: fetched sources are digest-verified and
 * public-safety-scanned before they ever reach the renderer.
 *
 * Inline styles are removed as well, because the content security policy grants
 * no `unsafe-inline` to style attributes. The upstream renderer expresses table
 * alignment as `style="text-align: left"`, so that single declaration becomes a
 * `data-align` attribute the stylesheet can select on; every other style
 * attribute is dropped.
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
    .replace(/\sstyle\s*=\s*"([^"]*)"/gi, (whole, value) => alignmentAttribute(value))
    .replace(/\sstyle\s*=\s*'([^']*)'/gi, (whole, value) => alignmentAttribute(value))
    .replace(/\sstyle\s*=\s*[^\s>]+/gi, '')
    .replace(/<img\b[^>]*>/gi, (tag) => policySafeImage(tag))
    .replace(/javascript:/gi, '');
}

/**
 * The alignment an inline style declared, as a selectable attribute, or an empty
 * string when the declaration carries no alignment the stylesheet can express.
 * @param {string} declaration
 * @returns {string}
 */
function alignmentAttribute(declaration) {
  const match = /^\s*text-align\s*:\s*(?:left|start|center|right|end)\s*;?\s*$/i.exec(declaration);
  return match ? ` data-align="${match[0].trim().split(':')[1].replace(/[;\s]/g, '').toLowerCase()}"` : '';
}

/**
 * The policy serves images from this origin and from inline data only, so the
 * corpus never renders a third-party image. A third-party reference becomes a
 * link that keeps the text it carried; an image path relative to the source
 * repository cannot be served from here at all, so it is dropped rather than
 * published as a broken image.
 * @param {string} tag the whole `<img>` tag
 * @returns {string}
 */
function policySafeImage(tag) {
  const src = /\ssrc\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ?? '';
  if (src.startsWith('/') || src.startsWith('data:')) return tag;
  if (!/^https?:\/\//i.test(src)) return '';
  const alt = /\salt\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ?? '';
  return `<a href="${src}" rel="noopener">${alt.trim() || src}</a>`;
}

/**
 * Put every rendered table inside a scroll frame. A markdown table can carry
 * more columns than a phone can show, and an unwrapped table either clips its
 * last columns or forces the whole page sideways. Mirrors the docs portal's
 * own table wrapper, which keeps the first column sticky while the rest moves.
 *
 * @param {string} html
 * @returns {string}
 */
export function wrapTables(html) {
  return html.replace(/<table\b[\s\S]*?<\/table>/gi, (table) => `<div class="lattice-prose-table">${table}</div>`);
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

/**
 * Give every second- and third-level heading a stable id and return the same
 * headings as table-of-contents entries. The ids are written here rather than
 * left to the markdown renderer so the copy in the rail always matches the
 * anchor in the page, including repeated headings.
 *
 * @param {string} html
 * @returns {{ html: string, toc: { id: string, text: string, level: number }[] }}
 */
export function collectHeadings(html) {
  const used = new Map();
  const toc = [];
  const withIds = html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (whole, level, attributes, inner) => {
    const text = decodeEntities(stripTags(inner)).trim();
    if (!text) return whole;
    const base = text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'section';
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    const id = seen === 0 ? base : `${base}-${seen}`;
    toc.push({ id, text, level: Number(level) });
    return `<h${level}${attributes.replace(/\sid="[^"]*"/, '')} id="${id}">${inner}</h${level}>`;
  });
  return { html: withIds, toc };
}

/**
 * Strip inline markup from a heading so only its words remain. Nested angle
 * brackets would survive a single pass, so repeat until the text stops
 * changing. The result only ever becomes a heading id, which is already
 * restricted to letters, digits, spaces and hyphens.
 *
 * @param {string} html
 * @returns {string}
 */
function stripTags(html) {
  let text = html;
  let previous;
  do {
    previous = text;
    text = text.replace(/<[^>]*>/g, '');
  } while (text !== previous);
  return text;
}

/**
 * Decode the entities the corpus actually uses, so a heading's id and its
 * visible text agree.
 *
 * @param {string} text
 * @returns {string}
 */
function decodeEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}
