import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

// A strict policy blocks inline `<style>` elements, and a web component that
// builds its styling as markup inside a shadow root is exactly that. The policy
// grants those blocks by hash instead of by `unsafe-inline`, so the hash is
// computed from what the build actually ships and is never hand-written.

const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;

/**
 * The text of every `<style>` block in a source file.
 * @param {string} source
 * @returns {string[]}
 */
export function styleBlocks(source) {
  return [...source.matchAll(STYLE_BLOCK)].map((match) => match[1]);
}

/**
 * One policy hash for a style block. The build refuses an escaped block: the
 * hash must cover the exact text the browser sees, and a template literal that
 * escapes characters would make this extractor disagree with the DOM.
 * @param {string} block
 * @param {string} path
 * @returns {string}
 */
function hashBlock(block, path) {
  if (block.includes('\\')) {
    throw new Error(`${path}: a style block contains an escape, so its policy hash cannot be derived from the file text.`);
  }
  return `'sha256-${createHash('sha256').update(block, 'utf8').digest('base64')}'`;
}

/**
 * Every style-block hash in the scripts and pages the build ships to a browser.
 * @param {string} directory the built client directory
 * @returns {string[]} quoted policy sources, sorted
 */
export function collectStyleHashes(directory) {
  const hashes = new Set();
  const visit = (path) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory()) {
        visit(child);
        continue;
      }
      if (!/\.(?:js|mjs|html)$/.test(entry.name)) continue;
      for (const block of styleBlocks(readFileSync(child, 'utf8'))) hashes.add(hashBlock(block, child));
    }
  };
  visit(directory);
  return [...hashes].sort();
}
