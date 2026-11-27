/**
 * Build helpers for build-time SVG diagrams. Diagrams are generated from
 * pipeline data only, carry no literal colours (styling flows from videsign
 * tokens through data attributes and classes), and always provide a title,
 * a description and a text-table equivalent rendered by the calling page.
 */

/**
 * Escape a string for XML text and attribute content.
 * @param {string} value
 * @returns {string}
 */
export function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 * Short commit form for labels.
 * @param {string | null | undefined} commit
 * @returns {string}
 */
export function shortCommit(commit) {
  return typeof commit === 'string' && commit.length >= 7 ? commit.slice(0, 7) : 'unknown';
}

/**
 * Build an SVG text element.
 * @param {{ x: number, y: number, label: string, className?: string, anchor?: string, emphasis?: boolean }} options
 * @returns {string}
 */
export function text({ x, y, label, className = 'diagram-label', anchor = 'start', emphasis = false }) {
  return `<text x="${x}" y="${y}" class="${className}" text-anchor="${anchor}"${emphasis ? ' data-diagram-emphasis="true"' : ''}>${esc(label)}</text>`;
}

/**
 * Build a rectangular node. State is expressed only through data attributes
 * resolved to tokens by the stylesheet.
 * @param {{ x: number, y: number, width: number, height: number, id: string, label: string, ci?: string, drift?: boolean | null, role?: string }} options
 * @returns {string}
 */
export function node({ x, y, width, height, id, label, ci = 'unknown', drift = null, role = '' }) {
  const attributes = [
    `class="diagram-node"`,
    `data-node="${esc(id)}"`,
    `data-ci="${esc(ci)}"`,
    drift === null ? '' : `data-drift="${drift ? 'true' : 'false'}"`,
    role ? `data-role="${esc(role)}"` : ''
  ].filter(Boolean).join(' ');
  const lines = label.split('\n');
  const texts = lines.map((line, index) => text({ x: x + width / 2, y: y + height / 2 - (lines.length - 1 - index) * 14 + 5, label: line, className: 'diagram-node-label', anchor: 'middle' }));
  return `<g ${attributes}><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" class="diagram-node-box" /><title>${esc(label)}</title>${texts.join('')}</g>`;
}

/**
 * Build an edge between two points with an optional pin label.
 * @param {{ x1: number, y1: number, x2: number, y2: number, label?: string, kind?: string }} options
 * @returns {string}
 */
export function edge({ x1, y1, x2, y2, label = '', kind = 'dependency' }) {
  const marker = `<path d="M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}" class="diagram-edge" data-edge-kind="${esc(kind)}" fill="none" />`;
  const caption = label ? text({ x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 6, label, className: 'diagram-edge-label', anchor: 'middle' }) : '';
  return marker + caption;
}

/**
 * Wrap diagram content in an accessible SVG root. The title and description
 * are required; pages render the text-table equivalent beside the graphic.
 * @param {{ id: string, title: string, desc: string, width: number, height: number, content: string }} options
 * @returns {string}
 */
export function svg({ id, title, desc, width, height, content }) {
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${esc(id)}-title ${esc(id)}-desc" class="diagram-svg" preserveAspectRatio="xMidYMid meet"><title id="${esc(id)}-title">${esc(title)}</title><desc id="${esc(id)}-desc">${esc(desc)}</desc>${content}</svg>`;
}
