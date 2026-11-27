import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalRedirect } from '../../src/lib/host.mjs';

test('canonical and alternate public hosts follow the domain rule', () => {
  assert.equal(canonicalRedirect('https://vidoxlabs.com/vivarium'), null);
  assert.equal(canonicalRedirect('https://www.vidoxlabs.com/vivarium'), 'https://vidoxlabs.com/vivarium');
  assert.equal(canonicalRedirect('https://vidoxlabs.dev/repositories'), 'https://vidoxlabs.com/repositories');
  assert.equal(canonicalRedirect('https://www.vidoxlabs.dev/docs'), 'https://vidoxlabs.com/docs');
  assert.equal(canonicalRedirect('https://www.vidoxlabs.com/'), 'https://vidoxlabs.com/');
});

test('a deep link keeps its path and a query string does not travel', () => {
  assert.equal(
    canonicalRedirect('https://www.vidoxlabs.com/docs/seed/architecture?from=share'),
    'https://vidoxlabs.com/docs/seed/architecture'
  );
  // Two leading slashes would read as a host to some clients, so the path is
  // collapsed to a single leading slash before it is joined to the origin.
  assert.equal(canonicalRedirect('https://vidoxlabs.dev//another.example/page'), 'https://vidoxlabs.com/another.example/page');
});

test('reserved example and preview hosts are served without a redirect', () => {
  assert.equal(canonicalRedirect('https://preview.example.test/'), null);
  assert.equal(canonicalRedirect('http://site.example/'), null);
});
