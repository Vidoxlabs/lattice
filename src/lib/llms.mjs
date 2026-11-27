// `llms.txt` and `llms-full.txt` describe the site to a language model. Both are
// generated from the same verified corpus and repository data the pages render,
// so a documentation sync updates them with no edit, and a page that failed
// verification is listed as a placeholder instead of contributing text.

/**
 * The repository a corpus page came from, and its blob URL at the synced head.
 * @param {{ kind: string, repo: string, head: string | null, sourcePath: string }} page
 * @returns {{ repo: string, url: string }}
 */
export function pageSource(page) {
  const repo = page.kind === 'hub' ? 'docs' : page.repo;
  const head = page.head ?? 'main';
  const path = page.kind === 'hub' ? page.sourcePath.replace(/^docs\//, '') : page.sourcePath;
  return { repo, url: `https://github.com/Vidoxlabs/${repo}/blob/${head}/${path}` };
}

/**
 * The site route for a corpus page.
 * @param {{ slug: string }} page
 * @param {string} origin
 * @returns {string}
 */
export function pageRoute(page, origin) {
  return page.slug ? `${origin}/docs/${page.slug}` : `${origin}/docs`;
}

/**
 * A one-line status label that matches what the pages say.
 * @param {{ gatheredBy: string }} status
 * @param {{ capturedAt: string | null, used: boolean } | undefined} snapshot
 * @returns {string}
 */
export function statusLabel(status, snapshot) {
  if (status.gatheredBy === 'docs') return 'Status is published by the documentation hub.';
  if (snapshot?.used) return `Status is a committed snapshot captured at ${snapshot.capturedAt ?? 'an unknown time'}.`;
  return 'Status is gathered by the site from public repository data.';
}

const SITE_PAGES = [
  ['/', 'Home', 'what Vidoxlabs builds, with generated diagrams and live status'],
  ['/vivarium', 'Vivarium', 'the product, its system map and its direction'],
  ['/repositories', 'Repositories', 'the public catalog with sourced status'],
  ['/docs', 'Docs', 'the verified documentation corpus, page by page'],
  ['/about', 'About', 'the company behind the product'],
  ['/security', 'Security', 'how to report a vulnerability'],
  ['/chat', 'Chat', 'grounded answers from the same corpus, with citations']
];

/**
 * The short index: the site, each repository with its source and head, then
 * every documentation page with its source. Placeholder pages are listed with
 * the reason they carry no text.
 * @param {{ pages: any[], repositories: any[], origin: string, status: any, snapshot: any }} input
 * @returns {string}
 */
export function llmsIndex({ pages, repositories, origin, status, snapshot }) {
  const lines = [
    '# Vidoxlabs',
    '',
    '> Vidoxlabs builds Vivarium, an open, local-first personal agent platform. This site renders the documentation hub, the public repository evidence and live status; bloom is the interface system, not the product.',
    '',
    statusLabel(status, snapshot),
    '',
    '## Site',
    ''
  ];
  for (const [path, title, description] of SITE_PAGES) lines.push(`- [${title}](${origin}${path}): ${description}.`);

  lines.push('', '## Repositories', '');
  for (const repository of repositories) {
    const head = repository.head ?? repository.repositoryHead ?? 'main';
    const source = `https://github.com/Vidoxlabs/${repository.name}/tree/${head}`;
    const summary = repository.summary?.trim();
    const described = summary ? `${summary.replace(/[.!?]$/, '')}. ` : '';
    lines.push(`- [${repository.name}](${origin}/repositories/${repository.name}): ${described}Source: ${source}`);
  }

  lines.push('', '## Documentation', '');
  for (const page of pages) {
    const route = pageRoute(page, origin);
    const source = pageSource(page);
    if (page.kind === 'placeholder') {
      lines.push(`- [${page.title}](${route}): placeholder. This page failed verification at build time and carries no text here; read ${source.url} instead.`);
    } else {
      lines.push(`- [${page.title}](${route}): rendered from ${source.repo} at ${source.url}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * The full text: every verified page with its route and source, then its body.
 * A placeholder contributes its title, route and source only.
 * @param {{ pages: any[], origin: string, status: any, snapshot: any }} input
 * @returns {string}
 */
export function llmsFull({ pages, origin, status, snapshot }) {
  const sections = [
    '# Vidoxlabs: full site text',
    '',
    `> Everything this site publishes, generated at build time from the verified documentation corpus and public repository data. Canonical origin: ${origin}`,
    '',
    statusLabel(status, snapshot),
    ''
  ];
  for (const page of pages) {
    const source = pageSource(page);
    sections.push(`## ${page.title}`, '', `Site page: ${pageRoute(page, origin)}`, `Upstream: ${source.url}`, `Source repository: Vidoxlabs/${source.repo} at ${page.head ?? 'main'}`, '');
    if (page.kind === 'placeholder') {
      sections.push('Placeholder: this page failed verification at build time, so no text from it is published here.', '');
      continue;
    }
    sections.push(stripMarkupNoise(page.body ?? '').trim(), '');
  }
  return sections.join('\n');
}

/**
 * Remove the markup that carries no text: the banner picture block and inline
 * HTML wrappers around diagram sources.
 * @param {string} markdown
 * @returns {string}
 */
function stripMarkupNoise(markdown) {
  return markdown
    .replace(/<picture>[\s\S]*?<\/picture>/gi, '')
    .replace(/<source\b[^>]*>/gi, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<\/?pre[^>]*>/gi, '');
}
