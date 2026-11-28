import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { SECURITY_TXT } from '../../src/lib/security-txt.mjs';

test('the worker route and the committed public file carry the same security.txt', async () => {
  const file = await readFile(new URL('../../public/.well-known/security.txt', import.meta.url), 'utf8');
  assert.equal(file, SECURITY_TXT, 'the two copies of the policy must not drift apart');
});

test('security.txt follows the published policy fields', () => {
  assert.match(SECURITY_TXT, /^Contact: mailto:admin@vidoxlabs\.dev$/m, 'the contact is the address the security page publishes');
  assert.match(SECURITY_TXT, /^Preferred-Languages: en$/m);
  assert.match(SECURITY_TXT, /^Canonical: https:\/\/vidoxlabs\.com\/\.well-known\/security\.txt$/m);
  assert.match(SECURITY_TXT, /^Policy: https:\/\/vidoxlabs\.com\/security$/m);
  const expiry = /^Expires: (\d{4}-\d{2}-\d{2})T/m.exec(SECURITY_TXT);
  assert.ok(expiry, 'the policy carries an expiry');
  assert.ok(new Date(expiry[1]).getTime() > Date.now() - 1, 'the expiry is a date');
});
