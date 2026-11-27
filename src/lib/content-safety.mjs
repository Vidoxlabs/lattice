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

export function isPublicContentSafe(source) {
  for (const pattern of forbidden) if (pattern.test(source)) return false;
  for (const token of source.toLowerCase().split(/[^a-z0-9]+/)) {
    if (token && digests.has(createHash('sha256').update(token).digest('hex'))) return false;
  }
  return true;
}
