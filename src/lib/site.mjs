// One place for the site's public origin. The layout builds canonical links
// from it and the build writes the sitemap and robots file from it, so a
// deployment that sets SITE_ORIGIN gets a consistent set of absolute URLs.

/**
 * The canonical public origin, without a trailing slash.
 * @returns {string}
 */
export function siteOrigin() {
  return (process.env.SITE_ORIGIN ?? 'https://vidoxlabs.com').replace(/\/+$/, '');
}

/**
 * A page path as the site publishes it: leading slash, no trailing slash, and
 * `/` for the home page.
 * @param {string} pathname
 * @returns {string}
 */
export function publicPath(pathname) {
  const trimmed = `/${pathname}`.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

/**
 * The absolute canonical URL for a page path.
 * @param {string} pathname
 * @returns {string}
 */
export function canonicalUrl(pathname) {
  return `${siteOrigin()}${publicPath(pathname)}`;
}
