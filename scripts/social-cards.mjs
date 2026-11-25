import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { SOCIAL_CARD_SIZE, socialCardSources } from '../src/lib/brand-images.mjs';

// Static SVG to PNG at build time with a pinned dependency, so the card a
// crawler fetches is a raster image rather than SVG markup it may refuse to
// render. A `-social` card already has the card aspect; a banner is 4:1, so it
// is centred on a card canvas filled with the banner's own background colour.

const { width, height } = SOCIAL_CARD_SIZE;

/**
 * The background colour a banner paints first, read from the banner itself so
 * the card inherits the artwork's own palette rather than a new one.
 * @param {string} source
 * @param {string} path
 * @returns {string}
 */
function backgroundOf(source, path) {
  const match = /<rect\b[^>]*\bfill="(#[0-9a-fA-F]{3,8})"/.exec(source);
  if (!match) throw new Error(`${path} paints no background rectangle, so a card cannot be composed from it.`);
  return match[1];
}

/**
 * One card, as a PNG buffer.
 * @param {string} path
 * @returns {Promise<Buffer>}
 */
export async function renderCard(path) {
  const source = readFileSync(path, 'utf8');
  if (path.endsWith('-social.svg')) {
    return sharp(Buffer.from(source)).resize(width, height, { fit: 'fill' }).png({ compressionLevel: 9 }).toBuffer();
  }
  const banner = await sharp(Buffer.from(source)).resize(width, null, { fit: 'inside' }).png().toBuffer();
  const { height: bannerHeight } = await sharp(banner).metadata();
  return sharp({ create: { width, height, channels: 3, background: backgroundOf(source, path) } })
    .composite([{ input: banner, top: Math.max(0, Math.round((height - (bannerHeight ?? 0)) / 2)), left: 0 }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Write every card the site references.
 * @param {string} directory the built client directory
 * @returns {Promise<string[]>} the card names written
 */
export async function writeSocialCards(directory) {
  mkdirSync(`${directory}/social`, { recursive: true });
  const written = [];
  for (const { source, file } of socialCardSources()) {
    writeFileSync(`${directory}/social/${source}.png`, await renderCard(`public/brand/${file}`));
    written.push(source);
  }
  return written;
}
