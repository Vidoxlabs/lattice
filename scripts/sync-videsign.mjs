import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const pin = readFileSync('src/styles/videsign/PIN', 'utf8').trim();
const organizationPin = 'b35e6dc975320a317d19beb2d25929d9cfdb27ca';
const packageRoot = resolve('node_modules/@vidoxlabs/videsign');
if (!existsSync(packageRoot)) throw new Error('Run npm ci before syncing videsign.');

// Publish filter. The upstream design system names some tokens after private
// team vocabulary, and those names are listed by digest in
// scripts/scrub-needles.json. The keys below are those digests — never the
// source words — and the values are the neutral aliases this site publishes.
// A private digest without an alias fails the sync instead of leaking.
const aliases = new Map([
  ['22d2084f01936c564e690d170959976647b46c843bcb313ff7312fc169dc889c', 'brand'],
  ['89831f5ffc4b30c293c9c3dbc0aac91e38a9c697b374dd105284659c6a992e8a', 'family-a'],
  ['101b68072dd659663f14fc77be63743948ada7742d2b8df01698041e1597c420', 'family-b'],
  ['efd764d832176b9356c8d0da7a87299e7266020116b12d8423772e3dca349d9e', 'family-c'],
  ['71ae1fa73547024d8587234db0746f92a653d0c9a6ac8150d49a146665369eb3', 'family-d']
]);
const privateDigests = new Set(JSON.parse(readFileSync('scripts/scrub-needles.json', 'utf8')).tokenSha256);

/**
 * Replace every private word in the text with its neutral alias.
 * @param {string} text
 * @returns {{ text: string, used: string[] }}
 */
function neutralize(text) {
  const used = new Set();
  const filtered = text.replace(/[A-Za-z0-9]+/g, (word) => {
    const digest = createHash('sha256').update(word.toLowerCase()).digest('hex');
    if (!privateDigests.has(digest)) return word;
    const alias = aliases.get(digest);
    if (!alias) throw new Error(`A private token has no neutral alias (digest ${digest.slice(0, 8)}). Add it to the alias map and sync again.`);
    used.add(alias);
    return alias;
  });
  return { text: filtered, used: [...used].sort() };
}

/**
 * Apply the publish filter to one synced stylesheet and record the alias map
 * in a header comment.
 * @param {string} name
 */
function publishStylesheet(name) {
  const path = resolve('src/styles/videsign', name);
  const { text, used } = neutralize(readFileSync(path, 'utf8'));
  const header = used.length
    ? `/* lattice publish filter: private tokens renamed to neutral aliases (${used.join(', ')}) by scripts/sync-videsign.mjs; digest keys live in scripts/scrub-needles.json. */\n`
    : '/* lattice publish filter: no private tokens were present. */\n';
  writeFileSync(path, header + text);
}

const generated = spawnSync('npm', ['run', 'tokens'], { cwd: packageRoot, stdio: 'inherit' });
if (generated.status !== 0) process.exit(generated.status ?? 1);

const output = resolve('src/styles/videsign');
mkdirSync(output, { recursive: true });
const sync = spawnSync(process.execPath, [
  resolve(packageRoot, 'consumer/sync-videsign-tokens.mjs'),
  '--source', resolve(packageRoot, 'dist/tokens.json'),
  '--glass', resolve(packageRoot, 'dist/glass.css'),
  '--sha', pin,
  '--out', resolve(output, 'tokens.css'),
  '--glass-out', resolve(output, 'glass.css')
], { stdio: 'inherit' });
if (sync.status !== 0) process.exit(sync.status ?? 1);

// Only the artifacts this site imports are published. The upstream package
// also generates data files that carry private vocabulary; they stay behind.
for (const name of ['themes.css', 'specimen-layouts.css', 'core-components.css']) {
  copyFileSync(resolve(packageRoot, 'dist', name), resolve(output, name));
}
for (const name of ['tokens.css', 'glass.css', 'themes.css', 'specimen-layouts.css', 'core-components.css']) {
  publishStylesheet(name);
}

const brandOutput = resolve('public/brand');
mkdirSync(brandOutput, { recursive: true });
const brandFiles = ['brand/brand_mark_header_v008.svg'];
for (const entry of readdirSync(resolve(packageRoot, 'brand/repo-banners'), { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.svg')) brandFiles.push(`brand/repo-banners/${entry.name}`);
}
for (const source of brandFiles) {
  copyFileSync(resolve(packageRoot, source), resolve(brandOutput, basename(source)));
}

for (const name of ['vidoxlabs-banner-dark.svg', 'vidoxlabs-banner-light.svg']) {
  const source = `https://raw.githubusercontent.com/Vidoxlabs/.github/${organizationPin}/profile/${name}`;
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Could not sync organization banner: ${response.status}`);
  writeFileSync(resolve(brandOutput, name), Buffer.from(await response.arrayBuffer()));
}

const sums = readdirSync(brandOutput, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
  .map((entry) => entry.name)
  .sort()
  .map((name) => `${createHash('sha256').update(readFileSync(resolve(brandOutput, name))).digest('hex')}  ${name}`);
writeFileSync(resolve(brandOutput, 'SHA256SUMS'), `${sums.join('\n')}\n`);
writeFileSync(resolve(brandOutput, 'PIN'), `Vidoxlabs/videsign ${pin}\nVidoxlabs/.github ${organizationPin}\n`);
console.log(`Synced videsign at ${pin}, published 5 filtered stylesheets and ${brandFiles.length + 2} brand assets.`);
