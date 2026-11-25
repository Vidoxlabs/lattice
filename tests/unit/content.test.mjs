import assert from 'node:assert/strict';
import test from 'node:test';
import { firstCommandBlock, firstParagraph } from '../../src/lib/repository-data.mjs';

test('README extraction uses prose and command evidence without markup', () => {
  const markdown = '# Example\n\n[An evidenced product](https://github.com/Vidoxlabs/vivarium) works locally.\n\n```sh\nnpm ci\nnpm test\n```\n';
  assert.equal(firstParagraph(markdown), 'An evidenced product works locally.');
  assert.equal(firstCommandBlock(markdown), 'npm ci\nnpm test');
});
