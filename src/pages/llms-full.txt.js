// @ts-ignore Astro provides this virtual module at build time.
import { getCollection } from 'astro:content';
import { getCatalog } from '../lib/repository-data.mjs';

export async function GET() {
  const SITE_ORIGIN = process.env.SITE_ORIGIN ?? 'https://vidoxlabs.com';
  const { repositories } = await getCatalog();
  const docs = await getCollection('docs');
  const sections = [];
  sections.push(`# Vidoxlabs: full site text\n\nCanonical origin: ${SITE_ORIGIN}\n\n## Repositories\n`);
  for (const repository of repositories) {
    sections.push(`### ${repository.name}\n\n${repository.summary || 'Documentation has not synced yet.'}\n\nSource: ${SITE_ORIGIN}/repositories/${repository.name}\n`);
  }
  sections.push('## Documentation corpus\n');
  for (const entry of docs) {
    const { title, repo, head, sourcePath, kind, slug } = entry.data;
    const route = slug ? `${SITE_ORIGIN}/docs/${slug}` : `${SITE_ORIGIN}/docs`;
    const origin = `https://github.com/Vidoxlabs/${repo === 'docs' ? 'docs' : repo}/blob/${head ?? 'main'}/${sourcePath}`;
    sections.push(`### ${title}\n\nSite page: ${route}\nUpstream: ${origin}\nKind: ${kind}\n\n${entry.body ?? ''}\n`);
  }
  return new Response(`${sections.join('\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
