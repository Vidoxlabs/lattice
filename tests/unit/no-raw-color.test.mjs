import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

test('only synced videsign artifacts contain raw color values', () => {
  const files = filesUnder('src').filter((file) => /\.(?:astro|css|mjs|js)$/.test(file) && !file.startsWith('src/styles/videsign/'));
  const forbidden = [
    /#[0-9a-f]{3,4}\b|#[0-9a-f]{6}(?:[0-9a-f]{2})?\b/i,
    /\b(?:rgb|rgba|hsl|hsla|oklch)\s*\(/i,
    /(?:^|;|\s)(?:color|background|background-color|border-color|fill|stroke)\s*:\s*(?:red|blue|green|white|black|transparent|orange|purple|pink|gray|grey)\b/i
  ];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of forbidden) assert.doesNotMatch(source, pattern, file);
  }
});

test('components do not use arbitrary pixel utilities', () => {
  const files = filesUnder('src').filter((file) => /\.(?:astro|css|mjs|js)$/.test(file) && !file.startsWith('src/styles/videsign/'));
  for (const file of files) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /\[[^\]]*\d+px[^\]]*\]/, file);
  }
});

test('local styles reference tokens emitted by the pinned design package', () => {
  const synced = filesUnder('src/styles/videsign').filter((file) => file.endsWith('.css')).map((file) => readFileSync(file, 'utf8')).join('\n');
  const local = readFileSync('src/styles/global.css', 'utf8');
  const references = [...local.matchAll(/var\((--vi-[a-z0-9-]+)\)/g)].map((match) => match[1]);
  for (const reference of references) assert.ok(synced.includes(`${reference}:`), `Missing token ${reference}`);
});
