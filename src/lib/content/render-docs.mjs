/**
 * Bumped whenever this module changes what a page looks like. The content layer
 * keys its store by the entry digest, so without the revision a cached page
 * would survive a renderer change and the build would publish the old markup.
 */
export const RENDER_REVISION = 7;

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
 * The pass walks the input once as a sequence of tags and text, instead of
 * filtering tags through overlapping regular expressions: a removal there can
 * adjoin two kept fragments into a new tag, which is what the code-scanning
 * alerts flagged. Because even removals done in one pass can adjoin fragments,
 * the whole walk repeats until the output stops changing; on corpus pages the
 * second walk changes nothing, and a reassembled tag never survives it.
 *
 * @param {string} html
 * @returns {string}
 */
export function sanitizeRenderedHtml(html) {
  let output = html;
  for (let pass = 0; pass < 4; pass += 1) {
    const next = sanitizePass(output);
    if (next === output) break;
    output = next;
  }
  return output;
}

/** Tags whose open and close forms are dropped while their content is kept. */
const dangerousTags = new Set(['iframe', 'object', 'embed', 'form', 'input', 'button', 'select', 'textarea', 'template', 'link', 'meta']);

/** Attribute forms the policy drops or rewrites, matched inside one tag. */
const policyAttribute = /\s(on[a-z]+|style)\s*=\s*(?:"([^"]*)"|'([^']*)'|[^\s>]+)/gi;

/** The URL scheme no attribute value or text may carry. */
const javascriptScheme = /javascript:/gi;

/**
 * One walk over the input: every tag is parsed once and either dropped,
 * rewritten by the image policy, or kept with its attributes sanitized; every
 * text run loses the forbidden URL scheme. The output is never re-scanned
 * inside this walk, so no replacement can reassemble within it.
 * @param {string} html
 * @returns {string}
 */
function sanitizePass(html) {
  let out = '';
  let index = 0;
  while (index < html.length) {
    const open = html.indexOf('<', index);
    if (open === -1) {
      out += withoutJavascriptScheme(html.slice(index));
      break;
    }
    if (open > index) out += withoutJavascriptScheme(html.slice(index, open));
    const tag = parseTag(html, open);
    if (!tag) {
      out += '<';
      index = open + 1;
      continue;
    }
    if (!tag.close && tag.name === 'script') {
      // An opening script tag is dropped together with everything up to and
      // including its close tag, so no script content survives in any form; a
      // self-closing one is dropped alone.
      if (!tag.selfClosing) {
        const end = /<\/script\s*>/i.exec(html.slice(tag.end));
        index = end ? tag.end + end.index + end[0].length : html.length;
      } else {
        index = tag.end;
      }
      continue;
    }
    if (dangerousTags.has(tag.name)) {
      index = tag.end;
      continue;
    }
    out += withoutJavascriptScheme(tag.name === 'img' ? policySafeImage(tag.text) : sanitizeAttributes(tag.text));
    index = tag.end;
  }
  return out;
}

/**
 * Parse the tag that starts at `open`, honouring quoted attribute values, or
 * return null when the character there does not open a tag: a stray `<` is
 * text, and text is never filtered.
 * @param {string} html
 * @param {number} open
 * @returns {{ name: string, close: boolean, selfClosing: boolean, text: string, end: number } | null}
 */
function parseTag(html, open) {
  let cursor = open + 1;
  let close = false;
  if (html[cursor] === '/') {
    close = true;
    cursor += 1;
  }
  const nameStart = cursor;
  cursor += 1;
  while (cursor < html.length && /[a-zA-Z0-9-]/.test(html[cursor])) cursor += 1;
  if (!/[a-zA-Z]/.test(html[nameStart] ?? '')) return null;
  const name = html.slice(nameStart, cursor).toLowerCase();
  let quote = '';
  while (cursor < html.length) {
    const char = html[cursor];
    if (quote) {
      if (char === quote) quote = '';
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return { name, close, selfClosing: html[cursor - 1] === '/', text: html.slice(open, cursor + 1), end: cursor + 1 };
    }
    cursor += 1;
  }
  return null;
}

/**
 * Keep a tag with its event-handler and style attributes removed or rewritten.
 * The removal happens on the tag's own text by match range, so the spacing and
 * every other attribute survive exactly as the source wrote them.
 * @param {string} tag
 * @returns {string}
 */
function sanitizeAttributes(tag) {
  let out = '';
  let index = 0;
  for (const match of tag.matchAll(policyAttribute)) {
    const [whole, name, doubleQuoted, singleQuoted] = match;
    const replacement = name.toLowerCase() === 'style' && doubleQuoted !== undefined
      ? alignmentAttribute(doubleQuoted)
      : name.toLowerCase() === 'style' && singleQuoted !== undefined
        ? alignmentAttribute(singleQuoted)
        : '';
    out += tag.slice(index, match.index) + replacement;
    index = match.index + whole.length;
  }
  return out + tag.slice(index);
}

/**
 * The text with every occurrence of the forbidden URL scheme removed, matched
 * case-insensitively and cut by range rather than replaced, so no partial
 * overlap can re-form one.
 * @param {string} text
 * @returns {string}
 */
function withoutJavascriptScheme(text) {
  if (!text.includes(':')) return text;
  let out = '';
  let index = 0;
  for (const match of text.matchAll(javascriptScheme)) {
    out += text.slice(index, match.index);
    index = match.index + match[0].length;
  }
  return out + text.slice(index);
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
 * text and the rest of the sentence: only the `Status: <label>` token is
 * wrapped, so the paragraph it opened keeps everything that followed the label.
 * Only the family's claim vocabulary is recognized; anything else stays as
 * written.
 *
 * @param {string} html
 * @returns {string}
 */
export function badgeClaimLines(html) {
  return html.replace(/<p>\s*Status:\s*<code>([a-z-]+)<\/code>/gi, (whole, label) =>
    ['implemented', 'specified', 'planned', 'observed'].includes(label)
      ? `<p class="lattice-claim-line">Status: <span class="lattice-claim-badge" data-claim="${label}">${label}</span>`
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
    const base = text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s/g, '-') || 'section';
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
 * visible text agree. Named entities decode first, then numeric ones; `&amp;`
 * stays last so a doubly escaped `&amp;lt;` becomes `&lt;` and not `<`.
 *
 * @param {string} text
 * @returns {string}
 */
function decodeEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (whole, code) => numericEntity(whole, Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (whole, code) => numericEntity(whole, Number(code)))
    .replace(/&amp;/g, '&');
}

/**
 * The character a numeric entity names, or the whole match when the code point
 * is not one a heading should carry: control characters, surrogates and codes
 * beyond the Unicode range stay escaped.
 *
 * @param {string} whole the whole entity match
 * @param {number} code the code point the entity names
 * @returns {string}
 */
function numericEntity(whole, code) {
  if (!Number.isInteger(code) || code < 0x20 || code > 0x10ffff) return whole;
  if (code >= 0xd800 && code <= 0xdfff) return whole;
  return String.fromCodePoint(code);
}
