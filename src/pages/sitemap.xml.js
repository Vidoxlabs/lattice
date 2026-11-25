// @ts-ignore Astro provides this virtual module at build time.
import { getCollection } from 'astro:content';
import { getCatalog } from '../lib/repository-data.mjs';

export async function GET() {
  const SITE_ORIGIN = process.env.SITE_ORIGIN ?? 'https://vidoxlabs.com';
  const { repositories } = await getCatalog();
  const docs = await getCollection('docs');
  const paths = [
    '/',
    '/vivarium',
    '/repositories',
    ...repositories.map((repository) => `/repositories/${repository.name}`),
    '/docs',
    ...docs.map((entry) => (entry.data.slug ? `/docs/${entry.data.slug}` : '/docs')),
    '/about',
    '/security',
    '/chat'
  ];
  const urls = [...new Set(paths)]
    .map((path) => `  <url><loc>${SITE_ORIGIN}${path === '/' ? '' : path}</loc></url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
