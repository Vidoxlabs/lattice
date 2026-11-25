const CANONICAL_HOST = 'vidoxlabs.com';
const CANONICAL_ORIGIN = 'https://vidoxlabs.com';
const COMPANY_DOMAINS = ['vidoxlabs.com', 'vidoxlabs.dev'];

function isCompanyHost(hostname) {
  return COMPANY_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

/**
 * Decide the redirect target for a request host. Only the company's own
 * non-canonical public domains are redirected; every other host (a local
 * preview, a reserved example name, an unconfigured domain) is served as-is.
 *
 * The request path is kept: `www` is an ordinary way in, so a deep link typed
 * or shared against it has to land on the same page on the canonical host. The
 * query string is dropped rather than copied: no route here reads one, and a
 * parameter attached to a foreign hostname has no business becoming part of
 * the canonical URL.
 *
 * @param {string | URL} value the request URL
 * @returns {string | null} the canonical URL to redirect to, or null
 */
export function canonicalRedirect(value) {
  const url = value instanceof URL ? value : new URL(value);
  if (url.hostname === CANONICAL_HOST) return null;
  if (!isCompanyHost(url.hostname)) return null;
  const path = url.pathname.replace(/^\/{2,}/, '/');
  return `${CANONICAL_ORIGIN}${path === '' ? '/' : path}`;
}
