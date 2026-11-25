import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const needles = JSON.parse(readFileSync(new URL('./scrub-needles.json', import.meta.url), 'utf8'));
const digests = new Set(needles.tokenSha256);
/** @type {[string, RegExp][]} */
const patterns = [
  ['workstation path', /(?:\/Users\/|\/home\/[A-Za-z0-9._-]+\/|[A-Za-z]:\\Users\\|\/private\/var\/folders\/)/i],
  ['private address', /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/],
  ['loopback or wildcard address', /\b127\.0\.0\.1\b|\blocal(?:host)\b|\b0\.0\.0\.0\b|:{2}1/i],
  ['host with port', /\b(?:[a-z0-9-]+\.)+[a-z]+:\d{2,5}\b/i],
  ['preview host', /\bworkers\.dev\b/i],
  ['hosting dashboard', /\bdash\.cloudflare\.com\b/i],
  ['private file link', /\bdrive\.google\.com\b|docs\.google\.com\/[^\s)<>]*\/d\//i],
  ['key-shaped value', /\b(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{10,}|gho_[A-Za-z0-9_]{10,}|github_pat_[A-Za-z0-9_]{10,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|xox[bp]-[A-Za-z0-9-]{10,})\b/],
  ['model suffix', /\b[A-Z][A-Za-z0-9]*-[LC]1\b/]
];
const failures = [];
const scanned = new Set();

function scan(path) {
  if (!statSync(path, { throwIfNoEntry: false })) return;
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (['node_modules', '.git', '.astro', '.wrangler', 'test-results', 'playwright-report'].includes(entry.name)) continue;
      scan(join(path, entry.name));
    }
    return;
  }
  if (!stat.isFile() || stat.size > 2_000_000 || /\.(?:png|jpg|jpeg|gif|ico|woff2?|zip|br)$/.test(path)) return;
  const absolute = join(process.cwd(), path);
  if (scanned.has(absolute)) return;
  scanned.add(absolute);
  const source = readFileSync(path, 'utf8');
  const lines = source.split('\n');
  lines.forEach((line, index) => {
    for (const [label, pattern] of patterns) {
      if (pattern.test(line)) failures.push(`${path}:${index + 1}: ${label}`);
    }
    for (const token of line.toLowerCase().split(/[^a-z0-9]+/)) {
      if (!token) continue;
      const digest = createHash('sha256').update(token).digest('hex');
      if (digests.has(digest)) failures.push(`${path}:${index + 1}: hashed needle`);
    }
  });
}

for (const path of process.argv.slice(2)) scan(path);
try {
  const message = execFileSync('git', ['log', '-1', '--format=%B'], { encoding: 'utf8' });
  if (/^\s*Co-authored-by:/im.test(message)) failures.push('latest commit: co-author trailer');
} catch {
  // A source archive has no Git metadata to inspect.
}

if (failures.length) {
  console.error([...new Set(failures)].join('\n'));
  process.exit(1);
}
console.log(`Public-safety scan passed for ${scanned.size} files.`);
