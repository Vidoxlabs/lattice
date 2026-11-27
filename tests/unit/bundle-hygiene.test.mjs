import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { projectRootForms, sanitizeWorkerBundle } from '../../scripts/bundle-hygiene.mjs';

/**
 * A checkout that is neither named `lattice` nor under a home directory, so the
 * mechanism is proven independent of the folder name and of the root.
 * @returns {{ root: string, server: string }}
 */
function fixture() {
  const root = join(mkdtempSync(join(tmpdir(), 'worker-bundle-')), 'probe-project');
  const server = join(root, 'dist', 'server');
  mkdirSync(join(server, 'chunks'), { recursive: true });
  const url = pathToFileURL(root).href;
  writeFileSync(join(server, 'entry.mjs'), [
    `const manifestPath = ${JSON.stringify(`${root}/excluded/manifest.json`)};`,
    `const manifestUrl = ${JSON.stringify(`${url}/excluded/manifest.json`)};`,
    "const unrelated = 'a path with no project root';",
    ''
  ].join('\n'));
  writeFileSync(join(server, 'chunks', 'chunk.mjs'), `export const source = ${JSON.stringify(`${root}/src/pages/index.astro`)};\n`);
  return { root, server };
}

test('the sanitizer removes a project root with any folder name, in path and URL form', () => {
  const { root, server } = fixture();
  const rewritten = sanitizeWorkerBundle({ directory: server, projectRoot: root });
  assert.deepEqual(rewritten.sort(), ['chunks/chunk.mjs', 'entry.mjs'], 'every generated module is covered');
  for (const name of rewritten) {
    const source = readFileSync(join(server, name), 'utf8');
    assert.equal(source.includes(root), false, `${name} still embeds the checkout path`);
    assert.equal(source.includes(pathToFileURL(root).href), false, `${name} still embeds the checkout file URL`);
    assert.match(source, /file:\/\/\/lattice|\/lattice\//, `${name} uses the neutral root`);
  }
  const entry = readFileSync(join(server, 'entry.mjs'), 'utf8');
  assert.match(entry, /a path with no project root/, 'unrelated text is untouched');
});

test('the sanitizer fails the build rather than shipping a path it cannot neutralize', () => {
  const { server } = fixture();
  // A checkout at the filesystem root has no removable prefix, so the build
  // stops instead of publishing a bundle it cannot clean.
  assert.throws(() => sanitizeWorkerBundle({ directory: server, projectRoot: '/' }), /still embeds the project root/);
});

test('the substitution order rewrites URLs before their inner path', () => {
  const forms = projectRootForms('/some/root/probe');
  assert.deepEqual(forms.map(([from]) => from), ['file:///some/root/probe', 'file:///some/root/probe', '/some/root/probe']);
  assert.deepEqual(forms.map(([, to]) => to), ['file:///lattice', 'file:///lattice', '/lattice']);
  assert.deepEqual(projectRootForms('/'), [], 'a filesystem root is never rewritten');
});
