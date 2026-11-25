import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { scanPaths } from '../../scripts/scrub-lib.mjs';
import { siteOrigin } from '../../src/lib/site.mjs';

const pipeline = JSON.parse(readFileSync('src/data/generated/build-pipeline.json', 'utf8'));
const origin = siteOrigin();
const index = readFileSync('dist/client/llms.txt', 'utf8');
const full = readFileSync('dist/client/llms-full.txt', 'utf8');

test('the index links every documentation page to its source repository and head', () => {
  const pages = pipeline.docsPages;
  assert.ok(pages.length > 100);
  for (const page of pages) {
    const route = page.slug ? `${origin}/docs/${page.slug}` : `${origin}/docs`;
    assert.ok(index.includes(`](${route})`), `missing ${route}`);
    const repo = page.kind === 'hub' ? 'docs' : page.repo;
    const head = page.head ?? 'main';
    assert.ok(index.includes(`https://github.com/Vidoxlabs/${repo}/blob/${head}/`), `missing a source link for ${page.title}`);
  }
  assert.equal(index.match(/^- \[/gm).length > pages.length, true);
});

test('a page that failed verification is a placeholder in both files and contributes no text', () => {
  const placeholders = pipeline.docsPages.filter((page) => page.kind === 'placeholder');
  assert.ok(placeholders.length > 0, 'the corpus has pages that fail verification');
  for (const page of placeholders) {
    const route = page.slug ? `${origin}/docs/${page.slug}` : `${origin}/docs`;
    assert.match(index, new RegExp(`\\[${page.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\(${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\): placeholder\\.`));
  }
  assert.equal(full.match(/Placeholder: this page failed verification/g).length, placeholders.length);
});

test('the full text covers every verified page', () => {
  const verified = pipeline.docsPages.filter((page) => page.kind !== 'placeholder');
  for (const page of verified) {
    assert.ok(full.includes(`## ${page.title}`), `missing a section for ${page.title}`);
  }
  assert.ok(full.length > 200_000, 'the full text carries the corpus');
  assert.ok(!full.includes('[object Object]'), 'no unresolved value reaches the text');
  assert.match(full.split('\n').slice(0, 5).join('\n'), /^# Vidoxlabs: full site text/, 'the file opens with its own heading');
});

test('both generated files pass the public-safety scan', () => {
  const { failures, scanned } = scanPaths(['dist/client/llms.txt', 'dist/client/llms-full.txt']);
  assert.equal(scanned, 2);
  assert.deepEqual(failures, []);
});

test('neither generated file carries the mapped vocabulary outside code', () => {
  for (const [name, text] of [['llms.txt', index], ['llms-full.txt', full]]) {
    const prose = text.replace(/```[\s\S]*?(?:```|$)/g, ' ').replace(/`[^`\n]*`/g, ' ');
    assert.doesNotMatch(prose, /\bsiblings?\b/i, `${name} carries the word outside code`);
    assert.ok(!prose.includes('mirroring five flower-named personas'), `${name} carries the clause outside code`);
  }
});
