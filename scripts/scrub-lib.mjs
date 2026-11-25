import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const needles = JSON.parse(readFileSync(new URL('./scrub-needles.json', import.meta.url), 'utf8'));
const privateDigests = new Set(needles.tokenSha256);

/**
 * Public-safety patterns. No file, path or extension is exempt from any of
 * them; the hashed-needle check below applies everywhere with the same rule.
 * @type {[string, RegExp][]}
 */
export const patterns = [
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

const skippedDirectories = new Set(['node_modules', '.git', '.astro', '.wrangler', 'test-results', 'playwright-report']);
// dist/server is the generated Worker bundle: framework code with its own
// internal literals, never committed and never publicly served. It is
// sanitized by scripts/postbuild.mjs and asserted by a dedicated route test
// instead of this scan; everything committed or publicly served is scanned.
const skippedPrefixes = ['dist/server/'];
const skippedExtensions = /\.(?:png|jpg|jpeg|gif|ico|woff2?|zip|br)$/;

/**
 * Collect every scannable file under the given roots, deterministically.
 * @param {string[]} roots
 * @returns {string[]}
 */
export function collectFiles(roots) {
  const files = [];
  const visit = (path) => {
    const stat = statSync(path, { throwIfNoEntry: false });
    if (!stat) return;
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path, { withFileTypes: true })) {
        if (skippedDirectories.has(entry.name)) continue;
        if (skippedPrefixes.some((prefix) => `${path}/${entry.name}/`.startsWith(prefix))) continue;
        visit(join(path, entry.name));
      }
      return;
    }
    if (skippedPrefixes.some((prefix) => path.startsWith(prefix))) return;
    if (stat.isFile() && stat.size <= 2_000_000 && !skippedExtensions.test(path)) files.push(path);
  };
  for (const root of roots) visit(root);
  return files.sort();
}

/**
 * Scan one file's text and return every public-safety failure, including the
 * hashed-needle check. There are no exemptions: every file gets the same rules.
 * @param {string} path
 * @param {string} source
 * @returns {string[]}
 */
export function scanText(path, source) {
  const failures = [];
  const lines = source.split('\n');
  lines.forEach((line, index) => {
    for (const [label, pattern] of patterns) {
      if (pattern.test(line)) failures.push(`${path}:${index + 1}: ${label}`);
    }
    for (const token of line.toLowerCase().split(/[^a-z0-9]+/)) {
      if (token && privateDigests.has(createHash('sha256').update(token).digest('hex'))) {
        failures.push(`${path}:${index + 1}: hashed needle`);
      }
    }
  });
  return failures;
}

/**
 * The file set git would publish: tracked files plus untracked files that no
 * ignore rule excludes. Local workspace overlays (excluded through ignore
 * rules and never committed) are outside the scan. Returns null outside a
 * repository, where every walked file is treated as publishable.
 * @returns {Set<string> | null}
 */
function gitPublishableFiles() {
  try {
    const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' });
    return new Set(output.split('\0').filter(Boolean));
  } catch {
    return null;
  }
}

/**
 * Scan the given roots and return the deduplicated failure list. Everything
 * git would publish is scanned, plus the built output and the fetched-content
 * bundle, which are ignored by git on purpose.
 * @param {string[]} roots
 * @returns {{ failures: string[], scanned: number }}
 */
export function scanPaths(roots) {
  const failures = [];
  const files = collectFiles(roots);
  const publishable = gitPublishableFiles();
  const deliberate = ['dist/', 'src/data/generated/'];
  const effective = files.filter((file) => {
    if (publishable && !publishable.has(file) && !deliberate.some((prefix) => file.startsWith(prefix))) return false;
    return true;
  });
  for (const file of effective) {
    failures.push(...scanText(file, readFileSync(file, 'utf8')));
  }
  return { failures: [...new Set(failures)], scanned: effective.length };
}
