import assert from 'node:assert/strict';
import test from 'node:test';
import { llmsFull, llmsIndex, pageRoute, pageSource, statusLabel } from '../../src/lib/llms.mjs';

const pages = [
  { title: 'Seed architecture', slug: 'seed/architecture', kind: 'source', repo: 'seed', head: 'a'.repeat(40), sourcePath: 'docs/architecture.md', body: '# Seed architecture\n\nText.' },
  { title: 'Bloom', slug: 'bloom', kind: 'placeholder', repo: 'bloom', head: 'b'.repeat(40), sourcePath: 'README.md', body: 'never published' },
  { title: 'Docs', slug: '', kind: 'hub', repo: 'docs', head: null, sourcePath: 'docs/index.md', body: '# Docs' }
];
const repositories = [{ name: 'seed', summary: 'Contracts and schemas.', head: 'a'.repeat(40) }, { name: 'bloom', summary: '' }];
const origin = 'https://example.test';
const status = { gatheredBy: 'site' };
const snapshot = { used: false, capturedAt: null };

test('a page links the repository and head it was rendered from', () => {
  assert.deepEqual(pageSource(pages[0]), { repo: 'seed', url: `https://github.com/Vidoxlabs/seed/blob/${'a'.repeat(40)}/docs/architecture.md` });
  assert.equal(pageSource(pages[2]).repo, 'docs', 'a hub page belongs to the hub repository');
  assert.match(pageSource(pages[2]).url, /^https:\/\/github\.com\/Vidoxlabs\/docs\/blob\/main\/index\.md$/);
  assert.equal(pageRoute(pages[0], origin), `${origin}/docs/seed/architecture`);
  assert.equal(pageRoute(pages[2], origin), `${origin}/docs`);
});

test('the status label matches what the pages say', () => {
  assert.equal(statusLabel({ gatheredBy: 'docs' }, snapshot), 'Status is published by the documentation hub.');
  assert.equal(statusLabel({ gatheredBy: 'site' }, snapshot), 'Status is gathered by the site from public repository data.');
  assert.match(statusLabel({ gatheredBy: 'snapshot' }, { used: true, capturedAt: '2026-01-01T00:00:00Z' }), /snapshot captured at 2026-01-01/);
});

test('the index lists every page with its source and a placeholder label', () => {
  const index = llmsIndex({ pages, repositories, origin, status, snapshot });
  assert.match(index, /^# Vidoxlabs$/m);
  assert.match(index, /- \[Seed architecture\]\(https:\/\/example\.test\/docs\/seed\/architecture\): rendered from seed at https:\/\/github\.com\/Vidoxlabs\/seed\/blob\//);
  assert.match(index, /- \[Bloom\]\(https:\/\/example\.test\/docs\/bloom\): placeholder\./);
  assert.match(index, /- \[seed\]\(https:\/\/example\.test\/repositories\/seed\): Contracts and schemas\. Source: https:\/\/github\.com\/Vidoxlabs\/seed\/tree\//);
  assert.doesNotMatch(index, /never published/);
});

test('the full text carries a verified page body and never a placeholder body', () => {
  const full = llmsFull({ pages, origin, status, snapshot });
  assert.match(full, /## Seed architecture/);
  assert.match(full, /Text\./);
  assert.match(full, /## Bloom[\s\S]*Placeholder: this page failed verification/);
  assert.doesNotMatch(full, /never published/);
  assert.doesNotMatch(full, /undefined|null/);
});
