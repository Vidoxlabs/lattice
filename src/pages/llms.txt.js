import { getCatalog } from '../lib/repository-data.mjs';

export async function GET() {
  const SITE_ORIGIN = process.env.SITE_ORIGIN ?? 'https://vidoxlabs.com';
  const { sources } = await getCatalog();
  const body = [
    '# The Vidoxlabs website: Vivarium, its systems, live status and docs.',
    '',
    `Vivarium is the product; bloom is its interface system. Status on this site is ${sources.status === 'docs' ? 'published by the documentation hub' : sources.status === 'site' ? 'gathered by the site from public GitHub data' : 'served from a committed, labelled snapshot'}.`,
    '',
    '## Site',
    '',
    `- [Home](${SITE_ORIGIN}/): what Vidoxlabs builds, with generated diagrams and live status.`,
    `- [Vivarium](${SITE_ORIGIN}/vivarium): the product, its system map and direction.`,
    `- [Repositories](${SITE_ORIGIN}/repositories): the public catalog with sourced status.`,
    `- [Docs](${SITE_ORIGIN}/docs): the verified documentation corpus, rendered page by page.`,
    `- [About](${SITE_ORIGIN}/about): the company behind the product.`,
    `- [Security](${SITE_ORIGIN}/security): how to report a vulnerability.`,
    `- [Chat](${SITE_ORIGIN}/chat): grounded answers from the same corpus, with citations.`,
    '',
    '## Policy',
    '',
    'Answers, pages and diagrams are generated from synced, digest-verified sources. A missing or failed verification renders a labelled placeholder, never stale text.',
    ''
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
