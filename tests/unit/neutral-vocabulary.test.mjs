import assert from 'node:assert/strict';
import test from 'node:test';
import { neutralize } from '../../src/lib/content/neutral-vocabulary.mjs';

test('the group word maps onto the neutral word, keeping the case shape', () => {
  assert.equal(neutralize('the sibling nodes'), 'the peer nodes');
  assert.equal(neutralize('the siblings of the root'), 'the peers of the root');
  assert.equal(neutralize('Sibling records'), 'Peer records');
  assert.equal(neutralize('SIBLINGS'), 'PEERS');
  assert.equal(neutralize("a sibling's key"), "a peer's key");
});

test('an identifier that contains the word keeps its letters', () => {
  assert.equal(neutralize('siblingCount and siblingsList stay as written'), 'siblingCount and siblingsList stay as written');
});

test('fenced code blocks and inline code keep their letters', () => {
  assert.equal(
    neutralize('prose about siblings first\n\n```sh\n# a sibling checkout stays as written\nnpm ci\n```\n\nafter text about a sibling'),
    'prose about peers first\n\n```sh\n# a sibling checkout stays as written\nnpm ci\n```\n\nafter text about a peer'
  );
  assert.equal(
    neutralize('the `repo-self-test-runs-without-siblings` capability keeps its name'),
    'the `repo-self-test-runs-without-siblings` capability keeps its name'
  );
  assert.equal(neutralize('`a` siblings `b` between code'), '`a` peers `b` between code');
  assert.equal(
    neutralize('~~~\nsibling sample\n~~~\nprose siblings'),
    '~~~\nsibling sample\n~~~\nprose peers'
  );
});

test('the persona clause is dropped from the design-law sentence', () => {
  assert.equal(
    neutralize('The family follows one design law: ordinary botanical words for public products, mirroring five flower-named personas.'),
    'The family follows one design law: ordinary botanical words for public products.'
  );
  assert.equal(
    neutralize('ordinary botanical words for public products, mirroring five flower-named personas, and tools'),
    'ordinary botanical words for public products, and tools'
  );
});

test('a sentence the clause does not match is kept as written', () => {
  const kept = 'The design law is ordinary botanical words for public products.';
  assert.equal(neutralize(kept), kept);
});

test('the mapping is idempotent, so a stored snapshot text maps cleanly twice', () => {
  const once = neutralize('Siblings mirror one parent, and every sibling holds a key, mirroring five flower-named personas.');
  assert.equal(neutralize(once), once);
});
