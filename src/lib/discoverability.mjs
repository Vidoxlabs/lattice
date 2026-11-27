import { readdirSync } from 'node:fs';
import { publicPath } from './site.mjs';

// The sitemap and the robots file are generated from what the build actually
// published, not from a list a person maintains. Every route that produced an
// HTML file appears in the sitemap, so documentation pages arrive with a sync.

const NOT_INDEXED = new Set(['/404']);

/**
 * Every published route under a built client directory.
 * @param {string} directory
 * @returns {string[]}
 */
export function builtRoutes(directory) {
  const routes = new Set();
  const visit = (path, prefix) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        visit(`${path}/${entry.name}`, `${prefix}${entry.name}/`);
        continue;
      }
      if (!entry.name.endsWith('.html')) continue;
      const route = entry.name === 'index.html' ? prefix : `${prefix}${entry.name.replace(/\.html$/, '')}`;
      const published = publicPath(route);
      if (!NOT_INDEXED.has(published)) routes.add(published);
    }
  };
  visit(directory, '');
  return [...routes].sort((a, b) => a.localeCompare(b));
}

/**
 * The sitemap body for a set of routes.
 * @param {string[]} routes published paths
 * @param {string} origin the canonical origin
 * @returns {string}
 */
export function sitemapXml(routes, origin) {
  const urls = routes
    .map((route) => `  <url><loc>${origin}${route === '/' ? '/' : route}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/**
 * The robots file body. The API and its chat endpoint are never useful to a
 * crawler, so they are excluded; the chat page itself is published and listed
 * in the sitemap.
 * @param {string} origin the canonical origin
 * @returns {string}
 */
export function robotsTxt(origin) {
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`;
}
