/**
 * The machine-readable contact policy, RFC 9116. The committed public file and
 * the Worker route that serves `/.well-known/security.txt` both carry exactly
 * this text, and the unit test keeps the two from drifting apart. The contact
 * address is the one the security page publishes; the expiry wants a refresh
 * within a year of each change.
 */
export const SECURITY_TXT = [
  'Contact: mailto:admin@vidoxlabs.dev',
  'Expires: 2027-11-25T00:00:00Z',
  'Preferred-Languages: en',
  'Canonical: https://vidoxlabs.com/.well-known/security.txt',
  'Policy: https://vidoxlabs.com/security'
].join('\n') + '\n';
