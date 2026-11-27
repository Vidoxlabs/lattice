import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

/**
 * The synced videsign stylesheets must not carry upstream section comments that
 * name outside design references, so the publish filter strips any
 * "(Name pattern)" suffix. This test fails if one reappears after a sync.
 */
const pattern = /\([A-Z][A-Za-z-]* pattern\)/;

function cssFiles(directory) {
  const found = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) found.push(...cssFiles(full));
    else if (entry.endsWith('.css')) found.push(full);
  }
  return found;
}

test('synced stylesheets carry no outside-name section comments', () => {
  const directory = join(import.meta.dirname, '..', '..', 'src', 'styles', 'videsign');
  for (const file of cssFiles(directory)) {
    const text = readFileSync(file, 'utf8');
    assert.ok(!pattern.test(text), `${file} contains an outside-name pattern comment; run npm run videsign:sync`);
  }
});
