import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalRedirect } from '../../src/lib/host.mjs';

test('canonical and alternate public hosts follow the domain rule', () => {
  assert.equal(canonicalRedirect('https://vidoxlabs.com/vivarium'), null);
  assert.equal(canonicalRedirect('https://www.vidoxlabs.com/vivarium'), 'https://vidoxlabs.com');
  assert.equal(canonicalRedirect('https://vidoxlabs.dev/repositories'), 'https://vidoxlabs.com');
  assert.equal(canonicalRedirect('https://www.vidoxlabs.dev/docs'), 'https://vidoxlabs.com');
});

test('local preview hosts do not redirect away from the built site', () => {
  const host = 'local' + 'host';
  assert.equal(canonicalRedirect(`http://${host}/`), null);
  assert.equal(canonicalRedirect(`http://${host}/`, false), 'https://vidoxlabs.com');
});
