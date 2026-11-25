import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const pin = readFileSync('src/styles/videsign/PIN', 'utf8').trim();
const organizationPin = 'b35e6dc975320a317d19beb2d25929d9cfdb27ca';
const packageRoot = resolve('node_modules/@vidoxlabs/videsign');
if (!existsSync(packageRoot)) throw new Error('Run npm ci before syncing videsign.');

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

for (const name of ['themes.css', 'standard.json', 'components.manifest.json', 'specimen-layouts.css', 'core-components.css']) {
  copyFileSync(resolve(packageRoot, 'dist', name), resolve(output, name));
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
console.log(`Synced videsign at ${pin} and ${brandFiles.length + 2} brand assets.`);
