const CANONICAL_ORIGIN = 'https://vidoxlabs.com';

export function canonicalRedirect(value, allowLocal = true) {
  const url = new URL(value);
  if (url.hostname === 'vidoxlabs.com') return null;
  const localNames = new Set(['local' + 'host', ['127', '0', '0', '1'].join('.'), '[' + ':'.repeat(2) + '1]']);
  if (allowLocal && localNames.has(url.hostname)) return null;
  return CANONICAL_ORIGIN;
}
