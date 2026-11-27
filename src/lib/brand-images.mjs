import brandInventory from '../data/generated/brand-files.json' with { type: 'json' };

// Social cards are built from the brand SVG family that is already in the
// repository: a `-social` card when the family has one, otherwise that family's
// dark banner placed on a card canvas. Nothing here is hand-drawn, and the list
// comes from the directory rather than from a hand-kept table.

const DEFAULT_CARD = 'vidoxlabs-banner-dark';
let brandFileSet;

/**
 * The SVG files the brand directory carries.
 * @returns {Set<string>}
 */
export function brandFiles() {
  if (!brandFileSet) brandFileSet = new Set(brandInventory.files);
  return brandFileSet;
}

/**
 * The social card source (without extension) for a page family, or the site
 * default when the family has no card of its own.
 * @param {string | undefined} family a repository or page family name
 * @returns {string}
 */
export function socialCard(family) {
  if (family) {
    if (brandFiles().has(`${family}-social.svg`)) return `${family}-social`;
    if (brandFiles().has(`${family}-banner-dark.svg`)) return `${family}-banner-dark`;
  }
  return DEFAULT_CARD;
}

/**
 * Every card the build generates: every `-social` SVG, every dark banner, and
 * the site default. The card URL is `/social/<source>.png`.
 * @returns {{ source: string, file: string }[]}
 */
export function socialCardSources() {
  const files = [...brandFiles()].sort();
  return files
    .filter((file) => file.endsWith('-social.svg') || file.endsWith('-banner-dark.svg'))
    .map((file) => ({ source: file.replace(/\.svg$/, ''), file }));
}

export const SOCIAL_CARD_SIZE = { width: 1200, height: 630 };
