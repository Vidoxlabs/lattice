import { createHash } from 'node:crypto';
import { isPublicContentSafe } from '../content-safety.mjs';

const DOCS_RAW = 'https://raw.githubusercontent.com/Vidoxlabs/docs/main';
const DOCS_API = 'https://api.github.com/repos/Vidoxlabs/docs';

/**
 * @typedef {object} DocsPage
 * @property {string} slug
 * @property {string} title
 * @property {string} repo
 * @property {string | null} head
 * @property {string} sourcePath
 * @property {'hub' | 'source' | 'placeholder'} kind
 * @property {string} body
 * @property {string[]} headings
 */

/**
 * Turn an in-repository file path into its site slug.
 * @param {string} repo
 * @param {string} sourcePath
 * @returns {string | null}
 */
export function slugFor(repo, sourcePath) {
  if (repo === 'docs') {
    if (sourcePath === 'index.md') return '';
    return sourcePath.replace(/\.md$/, '').replace(/\/index$/, '');
  }
  if (sourcePath === 'README.md') return repo;
  let inner = sourcePath;
  if (inner.startsWith('docs/')) inner = inner.slice('docs/'.length);
  else if (inner === 'AGENTS.md') inner = 'agents.md';
  else if (repo === 'videsign' && inner === 'DESIGN.md') inner = 'design.md';
  else return null;
  return `${repo}/${inner.replace(/\.md$/, '').replace(/\/index$/, '')}`;
}

/**
 * Derive a page title from its first heading, falling back to the file name.
 * @param {string} body
 * @param {string} sourcePath
 * @returns {string}
 */
export function titleFor(body, sourcePath) {
  const match = body.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  const base = sourcePath.split('/').pop() ?? sourcePath;
  return base.replace(/\.md$/, '').replace(/[-_]/g, ' ');
}

/**
 * Collect the first three heading levels for navigation and the search index.
 * @param {string} body
 * @returns {string[]}
 */
export function headingsFor(body) {
  return [...body.matchAll(/^#{2,3}\s+(.+)$/gm)].map((match) => match[1].trim()).slice(0, 40);
}

/**
 * Resolve a relative target against the document's directory, inside the
 * repository tree. Returns null when the target escapes the repository root.
 * @param {string} directory
 * @param {string} target
 * @returns {string | null}
 */
function joinInRepo(directory, target) {
  const parts = `${directory}${target}`.split('/');
  const stack = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (!stack.length) return null;
      stack.pop();
      continue;
    }
    stack.push(part);
  }
  return stack.join('/');
}

/**
 * Rewrite relative markdown links and images so they resolve from the site:
 * links to corpus files become site routes; anything else points at the exact
 * upstream file at the recorded head. Mermaid fences become source code with a
 * note, because the renderer ships no diagram runtime.
 *
 * @param {string} body
 * @param {{ repo: string, head: string | null, sourcePath: string, resolve: (repo: string, path: string) => string | null }} context
 * @returns {string}
 */
export function prepare(body, context) {
  const directory = context.sourcePath.includes('/') ? `${context.sourcePath.slice(0, context.sourcePath.lastIndexOf('/'))}/` : '';
  const resolve = (target) => {
    const normalized = target.split('#')[0];
    if (!normalized) return null;
    if (context.repo === 'docs') {
      const joined = joinInRepo(directory, normalized) ?? normalized;
      const site = context.resolve('docs', joined) ?? context.resolve('docs', normalized);
      return site ? { href: site, fragment: target.includes('#') ? `#${target.split('#')[1]}` : '' } : null;
    }
    const joined = joinInRepo(directory, normalized);
    if (joined === null) {
      return {
        href: `https://github.com/Vidoxlabs/${context.repo}/tree/${context.head ?? 'main'}`,
        fragment: ''
      };
    }
    const site = context.resolve(context.repo, joined) ?? context.resolve(context.repo, normalized);
    if (site) return { href: site, fragment: target.includes('#') ? `#${target.split('#')[1]}` : '' };
    return {
      href: `https://github.com/Vidoxlabs/${context.repo}/blob/${context.head ?? 'main'}/${joined}`,
      fragment: target.includes('#') ? `#${target.split('#')[1]}` : ''
    };
  };
  const links = body.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (whole, label, target) => {
    if (/^[a-z]+:\/\//i.test(target) || target.startsWith('#') || target.startsWith('mailto:')) return whole;
    const resolved = resolve(target);
    return resolved ? `[${label}](${resolved.href}${resolved.fragment})` : whole;
  });
  const images = links.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (whole, label, target) => {
    if (/^[a-z]+:\/\//i.test(target)) return whole;
    return `![${label}](https://raw.githubusercontent.com/Vidoxlabs/${context.repo}/${context.head ?? 'main'}/${target.replace(/^\//, '')})`;
  });
  return images.replace(/```mermaid\n([\s\S]*?)```/g, (_whole, source) => {
    const escaped = source.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return `> Diagram source. This block is a Mermaid definition; it is shown as source because the site renders no diagram runtime at build time.\n\n<pre class="lattice-diagram-source"><code>${escaped}</code></pre>`;
  });
}

/**
 * Build a (repo, in-repository path) to site-route resolver over a corpus.
 * The loader uses it to rewrite relative links before rendering.
 *
 * @param {{ repo: string, sourcePath: string, slug: string, kind: string }[]} pages
 * @returns {(repo: string, path: string) => string | null}
 */
export function buildResolver(pages) {
  const index = new Map(pages.map((page) => {
    // Hub pages store their repository path with the docs/ root, while
    // relative links inside them resolve against the bare page path.
    const inRepoPath = page.kind === 'hub' ? page.sourcePath.replace(/^docs\//, '') : page.sourcePath;
    return [`${page.repo}:${inRepoPath}`, page.slug ? `/docs/${page.slug}` : '/docs'];
  }));
  return (repo, path) => index.get(`${repo}:${path}`) ?? null;
}

/**
 * Build the documentation corpus: every manifest markdown file, digest
 * verified, plus the documentation hub's own pages. A file whose digest fails
 * or that fails the public-safety scan renders a clear placeholder instead of
 * its text. A failed hub listing falls back to the snapshot's hub pages.
 *
 * @param {import('./pipeline.mjs').FetchLike} fetchImpl
 * @param {any} manifest
 * @param {string} token
 * @param {DocsPage[]} fallbackPages
 * @returns {Promise<DocsPage[]>}
 */
export async function collectDocsCorpus(fetchImpl, manifest, token, fallbackPages = []) {
  const pages = [];
  const fallbackByPath = new Map(fallbackPages.map((page) => [`${page.repo}:${page.sourcePath}`, page]));

  for (const [repo, source] of Object.entries(manifest.sources ?? {})) {
    for (const record of source.files ?? []) {
      if (!record.path.endsWith('.md')) continue;
      const slug = slugFor(repo, record.path);
      if (slug === null) continue;
      let text = null;
      try {
        const response = await fetchImpl(`${DOCS_RAW}/sources/${repo}/${record.path}`, { headers: {} });
        if (response.ok) text = await response.text();
      } catch {
        text = null;
      }
      if (text === null) text = fallbackByPath.get(`${repo}:${record.path}`)?.body ?? null;
      const digest = text === null ? null : createHash('sha256').update(text).digest('hex');
      const verified = text !== null && digest === record.sha256;
      if (!verified || !isPublicContentSafe(text ?? '')) {
        const reason = text === null ? 'it could not be fetched in this build' : !verified ? 'its digest did not verify' : 'it failed the public-safety scan';
        pages.push({
          slug,
          title: titleFor(text ?? '', record.path),
          repo,
          head: source.head ?? null,
          sourcePath: record.path,
          kind: 'placeholder',
          body: `> This page is in the documentation manifest, but ${reason} at build time, so the site renders none of its text. Read it at the source repository instead: [${repo} at ${source.head?.slice(0, 7) ?? 'main'}](https://github.com/Vidoxlabs/${repo}/blob/${source.head ?? 'main'}/${record.path}).`,
          headings: []
        });
        continue;
      }
      pages.push({
        slug,
        title: titleFor(text, record.path),
        repo,
        head: source.head ?? null,
        sourcePath: record.path,
        kind: 'source',
        body: text,
        headings: headingsFor(text)
      });
    }
  }

  let hubHead = null;
  let hubPaths = [];
  try {
    const response = await fetchImpl(`${DOCS_API}/git/trees/main?recursive=1`, { headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (response.ok) {
      const tree = await response.json();
      hubHead = typeof tree.sha === 'string' ? tree.sha : null;
      hubPaths = (tree.tree ?? [])
        .filter((entry) => entry.type === 'blob' && typeof entry.path === 'string' && entry.path.startsWith('docs/') && entry.path.endsWith('.md') && !entry.path.includes(' '))
        .map((entry) => entry.path.slice('docs/'.length));
    }
  } catch {
    hubPaths = [];
  }
  if (!hubPaths.length) {
    const fallbackHub = fallbackPages.filter((page) => page.kind === 'hub');
    if (fallbackHub.length) {
      hubHead = fallbackHub[0].head;
      hubPaths = fallbackHub.map((page) => page.sourcePath.replace(/^docs\//, ''));
    }
  }
  for (const path of hubPaths.sort()) {
    let text = null;
    try {
      const response = await fetchImpl(`${DOCS_RAW}/docs/${path}`, { headers: {} });
      if (response.ok) text = await response.text();
    } catch {
      text = null;
    }
    if (text === null) text = fallbackByPath.get(`docs:docs/${path}`)?.body ?? null;
    if (text === null || !isPublicContentSafe(text)) continue;
    const slug = slugFor('docs', path);
    pages.push({
      slug,
      title: titleFor(text, path),
      repo: 'docs',
      head: hubHead,
      sourcePath: `docs/${path}`,
      kind: 'hub',
      body: text,
      headings: headingsFor(text)
    });
  }

  const hubIndex = pages.find((page) => page.kind === 'hub' && page.slug === '');
  if (!hubIndex) {
    pages.push({
      slug: '',
      title: 'Vidoxlabs docs',
      repo: 'docs',
      head: hubHead,
      sourcePath: 'docs/index.md',
      kind: 'hub',
      body: '> The documentation hub\'s own pages could not be fetched in this build, so only the synced repository pages are listed in the navigation. The hub\'s articles return on the next successful fetch; read them meanwhile at the [documentation repository](https://github.com/Vidoxlabs/docs/tree/main/docs).',
      headings: []
    });
  }

  return pages.sort((a, b) => a.slug.localeCompare(b.slug));
}
