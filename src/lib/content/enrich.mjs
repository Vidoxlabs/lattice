/**
 * Optional documentation enrichment hook (ADR-0004). Disabled by default: with
 * `ENRICH_ENABLED` unset the corpus passes through unchanged and the build is
 * identical to a build without this module.
 *
 * The accepted design, to be implemented only when a provider is wired:
 * - a hard per-run cost cap through `ENRICH_MAX_USD`;
 * - results cached by each source file's manifest digest, so unchanged pages
 *   never re-run;
 * - output may only restructure or visualize what the source already says,
 *   and every enriched block keeps its source citation;
 * - the deterministic presentation templates always run first, and
 *   enrichment only adds to them.
 *
 * @param {any[]} pages
 * @param {{ enabled?: boolean, maxUsd?: number }} [options]
 * @returns {any[]}
 */
export function enrichDocsCorpus(pages, options = {}) {
  if (!options.enabled) return pages;
  const cap = Number(options.maxUsd ?? 0);
  if (!(cap > 0)) return pages;
  // No provider is wired: until one is, an enabled run is a no-op that
  // records intent only, so the deterministic build stays the source of truth.
  return pages;
}
