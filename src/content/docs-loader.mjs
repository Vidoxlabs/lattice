import { readFile } from 'node:fs/promises';
import { buildResolver, prepare } from '../lib/content/docs-corpus.mjs';
import { enrichDocsCorpus } from '../lib/content/enrich.mjs';
import { badgeClaimLines, sanitizeRenderedHtml } from '../lib/content/render-docs.mjs';

/**
 * Content-layer loader for the documentation corpus. The prebuild step has
 * already fetched, digest-verified and public-safety-scanned every page into
 * the generated pipeline bundle; this loader prepares each raw page (relative
 * links to site routes or upstream sources, Mermaid fences to source with a
 * note), renders it with the project markdown pipeline, sanitizes the result
 * and labels claim-status lines.
 */
export function docsLoader() {
  return {
    name: 'lattice-docs-corpus',
    async load({ store, renderMarkdown, generateDigest }) {
      const pipeline = JSON.parse(await readFile(new URL('../data/generated/build-pipeline.json', import.meta.url), 'utf8'));
      const pages = enrichDocsCorpus(pipeline.docsPages, {
        enabled: process.env.ENRICH_ENABLED === '1',
        maxUsd: Number(process.env.ENRICH_MAX_USD ?? 0)
      });
      const resolve = buildResolver(pipeline.docsPages);
      for (const page of pages) {
        const inRepoPath = page.kind === 'hub' ? page.sourcePath.replace(/^docs\//, '') : page.sourcePath;
        const body = page.kind === 'placeholder'
          ? page.body
          : prepare(page.body, { repo: page.repo, head: page.head, sourcePath: inRepoPath, resolve });
        const rendered = await renderMarkdown(body);
        rendered.html = badgeClaimLines(sanitizeRenderedHtml(rendered.html));
        store.set({
          id: page.slug || 'index',
          data: {
            slug: page.slug,
            title: page.title,
            repo: page.repo,
            head: page.head,
            sourcePath: page.sourcePath,
            kind: page.kind,
            headings: page.headings
          },
          body,
          rendered,
          digest: generateDigest(body)
        });
      }
    }
  };
}
