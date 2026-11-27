import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// Every custom property the site references has to resolve, or the browser
// silently falls back to whatever the declaration stack happens to hold. The
// site had invented names before, so this is a hard check.

function filesUnder(directory, extensions) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(path, extensions);
    return extensions.some((extension) => path.endsWith(extension)) ? [path] : [];
  });
}

const synced = filesUnder('src/styles/videsign', ['.css']);
const own = filesUnder('src/styles', ['.css']).filter((path) => !synced.includes(path));
const markup = [...filesUnder('src', ['.astro', '.mjs'])];

const defined = new Set();
for (const file of [...synced, ...own]) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(--vi-[a-z0-9-]+)\s*:/g)) defined.add(match[1]);
}

const used = new Map();
for (const file of [...own, ...markup]) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/var\((--vi-[a-z0-9-]+)/g)) {
    if (!used.has(match[1])) used.set(match[1], new Set());
    used.get(match[1]).add(file);
  }
}

test('every videsign token the site references is defined', () => {
  assert.ok(defined.size > 100, `Only ${defined.size} tokens were found; the synced stylesheets look missing.`);
  const missing = [...used.entries()].filter(([name]) => !defined.has(name));
  assert.deepEqual(
    missing.map(([name, files]) => `${name} (${[...files].sort().join(', ')})`),
    [],
    'Undefined tokens fall back to nothing; use a name from the synced videsign stylesheets.'
  );
});

test('fonts are self-hosted with nothing fetched from another origin', () => {
  const styles = [...synced, ...own].map((file) => readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(styles, /fonts\.(?:googleapis|gstatic)\.com/, 'Fonts must load from this origin.');
  const sources = [...styles.matchAll(/url\(['"]?(\/fonts\/[^'")]+)/g)].map((match) => match[1]);
  assert.ok(sources.length >= 2, 'Expected a self-hosted sans and mono face.');
  for (const source of new Set(sources)) {
    assert.ok(existsSync(join('public', source)), `${source} is referenced but missing from public/.`);
  }
  const licences = readdirSync('public/fonts').filter((name) => /licen[cs]e/i.test(name));
  assert.ok(licences.length >= 2, 'Keep both font licences next to the files.');
});

test('the holder of the theme is videsign, not a local override', () => {
  const local = own.map((file) => readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(local, /\[data-theme=['"]light['"]\][^{]*\{[^}]*--vi-colors-/, 'Light theme colours belong to the synced themes.css.');
});
