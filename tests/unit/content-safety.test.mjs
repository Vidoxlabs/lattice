import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import {
  colourTokenDocuments,
  colourTokenException,
  isPublicContentSafe,
  needleDigests
} from '../../src/lib/content-safety.mjs';

test('the colour-token exception is scoped to the two videsign documents and real needles', () => {
  assert.deepEqual([...colourTokenDocuments].sort(), ['videsign/DESIGN.md', 'videsign/README.md']);
  for (const digest of colourTokenException) {
    assert.ok(needleDigests.has(digest), 'every exempt token must be a real needle digest');
  }
});

test('an exempt token passes only inside its named documents', () => {
  // The real colour tokens cannot be spelled here (the scan would flag this
  // file), so the mechanism is exercised with a synthetic digest registered
  // in the same sets the module consults.
  const synthetic = createHash('sha256').update('syntheticexceptiontoken').digest('hex');
  needleDigests.add(synthetic);
  colourTokenException.add(synthetic);
  try {
    const ramp = 'The ramp lists syntheticexceptiontoken as an accent.';
    assert.equal(isPublicContentSafe(ramp, 'videsign/README.md'), true);
    assert.equal(isPublicContentSafe(ramp, 'videsign/DESIGN.md'), true);
    assert.equal(isPublicContentSafe(ramp, 'videsign/docs/examples.md'), false);
    assert.equal(isPublicContentSafe(ramp, 'seed/README.md'), false);
    assert.equal(isPublicContentSafe(ramp), false);
    // A forbidden pattern is never exempt, even inside the named documents.
    // The pattern value is assembled at run time so this file itself stays
    // free of the literal the scan would flag.
    const loopback = ['127', '0', '0', '1'].join('.');
    assert.equal(isPublicContentSafe(`Open the local address ${loopback} today`, 'videsign/README.md'), false);
  } finally {
    needleDigests.delete(synthetic);
    colourTokenException.delete(synthetic);
  }
});

test('a needle outside the exception still blocks the exempt documents', () => {
  const synthetic = createHash('sha256').update('syntheticplainneedle').digest('hex');
  needleDigests.add(synthetic);
  try {
    assert.equal(isPublicContentSafe('carries syntheticplainneedle here', 'videsign/README.md'), false);
    assert.equal(isPublicContentSafe('carries syntheticplainneedle here', 'seed/README.md'), false);
  } finally {
    needleDigests.delete(synthetic);
  }
});
