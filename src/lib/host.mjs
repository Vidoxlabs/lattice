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
 * @param {string | URL} value the request URL
 * @returns {string | null} the canonical origin to redirect to, or null
 */
export function canonicalRedirect(value) {
  const url = value instanceof URL ? value : new URL(value);
  if (url.hostname === CANONICAL_HOST) return null;
  return isCompanyHost(url.hostname) ? CANONICAL_ORIGIN : null;
}
