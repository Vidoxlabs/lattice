import { createHash } from 'node:crypto';
import needles from '../../scripts/scrub-needles.json' with { type: 'json' };

const digests = new Set(needles.tokenSha256);
const forbidden = [
  /(?:\/Users\/|\/home\/[A-Za-z0-9._-]+\/|[A-Za-z]:\\Users\\)/i,
  /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/,
  /\b127\.0\.0\.1\b|\blocal(?:host)\b|\b0\.0\.0\.0\b|:{2}1/i,
  /\bworkers\.dev\b|\bdash\.cloudflare\.com\b/i,
  /\b(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{10,}|gho_[A-Za-z0-9_]{10,}|github_pat_[A-Za-z0-9_]{10,})\b/
];

// Scoped colour-token exceptions. The videsign palette ramp carries the five
// accent colour words as load-bearing API names: generated artefacts (the
// token style sheet, the consumer bindings and the dialect pack) consume
// them, so the words cannot be rewritten. The exception lists the exact token
// digests and only the two documents the site serves from that repository;
// every other needle still blocks those files, and these tokens still block
// every other file. The sets are exported so the tests can exercise the
// mechanism with a synthetic digest, without writing the tokens themselves.
export const needleDigests = digests;
export const colourTokenException = new Set([
  '22d2084f01936c564e690d170959976647b46c843bcb313ff7312fc169dc889c',
  '89831f5ffc4b30c293c9c3dbc0aac91e38a9c697b374dd105284659c6a992e8a',
  '101b68072dd659663f14fc77be63743948ada7742d2b8df01698041e1597c420',
  'efd764d832176b9356c8d0da7a87299e7266020116b12d8423772e3dca349d9e',
  '71ae1fa73547024d8587234db0746f92a653d0c9a6ac8150d49a146665369eb3'
]);
export const colourTokenDocuments = new Set(['videsign/README.md', 'videsign/DESIGN.md']);

/**
 * @param {string} source
 * @param {string} [documentId] repository-qualified document path, `repo/path`
 */
export function isPublicContentSafe(source, documentId = '') {
  for (const pattern of forbidden) if (pattern.test(source)) return false;
  const allowsColourTokens = colourTokenDocuments.has(documentId);
  for (const token of source.toLowerCase().split(/[^a-z0-9]+/)) {
    if (!token) continue;
    const digest = createHash('sha256').update(token).digest('hex');
    if (digests.has(digest) && !(allowsColourTokens && colourTokenException.has(digest))) return false;
  }
  return true;
}
