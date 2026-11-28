/**
 * One place that renders a timestamp for a page: a readable date or moment in
 * the eastern zone the site labels, with the ISO value kept in the
 * `<time datetime>` the caller writes. Every raw ISO date shown on a page goes
 * through here, so no card or timeline prints a machine timestamp.
 */
const EASTERN = 'America/New_York';

/**
 * The readable form of an ISO timestamp in the site's zone, or an empty string
 * for a missing or unparseable value.
 * @param {string | null | undefined} iso
 * @param {{ withTime?: boolean }} [options]
 * @returns {string}
 */
export function readableDate(iso, { withTime = false } = {}) {
  if (typeof iso !== 'string' || !iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const options = /** @type {Intl.DateTimeFormatOptions} */ ({ month: 'short', day: 'numeric', year: 'numeric', timeZone: EASTERN });
  if (withTime) {
    options.hour = 'numeric';
    options.minute = '2-digit';
  }
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * The readable form with its zone label, for prose, cards and diagrams.
 * @param {string | null | undefined} iso
 * @param {{ withTime?: boolean }} [options]
 * @returns {string}
 */
export function dateLabel(iso, options) {
  const readable = readableDate(iso, options);
  return readable ? `${readable} ET` : '';
}
