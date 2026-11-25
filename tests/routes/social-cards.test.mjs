import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import test from 'node:test';
import { SOCIAL_CARD_SIZE, socialCard } from '../../src/lib/brand-images.mjs';
import { siteOrigin } from '../../src/lib/site.mjs';

/**
 * Every built page.
 * @returns {string[]}
 */
function builtPages() {
  const pages = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) visit(path);
      else if (entry.name.endsWith('.html')) pages.push(path);
    }
  };
  visit('dist/client');
  return pages.sort();
}

/**
 * The width and height of a PNG, read from its header.
 * @param {string} path
 * @returns {{ signature: string, width: number, height: number }}
 */
function pngSize(path) {
  const header = readFileSync(path).subarray(0, 24);
  return { signature: header.subarray(1, 4).toString('ascii'), width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

test('every built page carries Open Graph and Twitter cards', () => {
  const origin = siteOrigin();
  const pages = builtPages();
  assert.ok(pages.length > 100);
  for (const path of pages) {
    const html = readFileSync(path, 'utf8');
    for (const tag of ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:alt', 'og:type', 'og:site_name']) {
      assert.match(html, new RegExp(`<meta property="${tag}" content="[^"]+"`), `${path}: missing ${tag}`);
    }
    for (const tag of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
      assert.match(html, new RegExp(`<meta name="${tag}" content="[^"]+"`), `${path}: missing ${tag}`);
    }
    assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
    const image = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1] ?? '';
    assert.ok(image.startsWith(`${origin}/social/`), `${path}: the card must be an absolute site URL`);
    assert.ok(image.endsWith('.png'), `${path}: the card must be a raster image`);
  }
});

test('every referenced card exists, is a PNG and has the declared size', () => {
  const images = new Set();
  for (const path of builtPages()) {
    const html = readFileSync(path, 'utf8');
    const image = /<meta property="og:image" content="([^"]+)"/.exec(html)[1];
    const relative = image.replace(siteOrigin(), '');
    images.add(relative);
    const file = `dist/client${relative}`;
    assert.ok(existsSync(file), `missing card ${relative}`);
    const size = pngSize(file);
    assert.equal(size.signature, 'PNG', `${relative} is not a PNG`);
    assert.deepEqual({ width: size.width, height: size.height }, SOCIAL_CARD_SIZE, `${relative} has the card size`);
    assert.match(html, new RegExp(`<meta property="og:image:width" content="${SOCIAL_CARD_SIZE.width}"`));
    assert.match(html, new RegExp(`<meta property="og:image:height" content="${SOCIAL_CARD_SIZE.height}"`));
  }
  assert.ok(images.size > 3, 'the build produces a card per page family');
});

test('a page family uses its own card and the site default stands in otherwise', () => {
  assert.equal(socialCard('seed'), 'seed-social');
  assert.equal(socialCard('docs'), 'docs-social');
  assert.equal(socialCard('vivarium'), 'vidoxlabs-banner-dark', 'a family without art of its own falls back to the site card');
  assert.equal(socialCard(undefined), 'vidoxlabs-banner-dark');
  const repo = readFileSync('dist/client/repositories/seed/index.html', 'utf8');
  assert.match(repo, /og:image" content="[^"]*\/social\/seed-social\.png"/);
  const docs = readFileSync('dist/client/docs/seed/architecture/index.html', 'utf8');
  assert.match(docs, /og:image" content="[^"]*\/social\/docs-social\.png"/);
});

test('the cards are small enough to serve', () => {
  const files = readdirSync('dist/client/social');
  assert.ok(files.length >= 8);
  for (const file of files) {
    const bytes = statSync(`dist/client/social/${file}`).size;
    assert.ok(bytes < 200_000, `${file} is ${bytes} bytes`);
  }
});
