// The documentation corpus arrives from the other repositories, and some of its
// prose uses a group word this site does not publish. This module is the single
// place that maps it. The content pipeline applies it to a text only after that
// text has verified against its manifest digest, so verification still refers
// to the upstream bytes and the published output carries the mapped wording.
// The mapping is lattice-side until the owning repositories change their own
// text; when they do, this module and its tests are retired with it. See
// docs/naming-inventory.md.

// The design-law sentence in the corpus adds a clause that names the persona
// mirror. This site publishes none of that, so the clause is dropped from the
// sentence rather than reworded. The observed form is a trailing addition after
// a comma; a form that does not match here keeps the sentence as written, and
// the built-output check reports it.
const CLAUSE = /,?\s+mirroring five flower-named personas(?=[.;:!?,)\s]|$)/gi;

// Fenced code blocks and inline code spans. A corpus text is markdown, so this
// is the boundary between prose and code: identifiers, sample commands and
// comments inside code are the upstream's own names and stay as written.
const CODE_SEGMENT = /(```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]*`)/g;

/**
 * Map one matched word onto its replacement, keeping the case shape of the
 * match: lowercase stays lowercase, a capitalised first letter stays
 * capitalised, and an all-caps match stays all caps.
 * @param {string} matched
 * @param {string} replacement
 * @returns {string}
 */
function withCase(matched, replacement) {
  if (matched === matched.toUpperCase() && matched !== matched.toLowerCase()) return replacement.toUpperCase();
  if (matched[0] === matched[0].toUpperCase() && matched.slice(1) === matched.slice(1).toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/**
 * The published vocabulary for prose segments. Whole words only, so an
 * identifier that merely contains the word keeps its letters. Running it on
 * already-mapped text changes nothing, which is what lets a stored snapshot
 * text pass through again.
 * @param {string} text
 * @returns {string}
 */
function mapProse(text) {
  return text
    .replace(CLAUSE, '')
    .replace(/\bsiblings\b/gi, (word) => withCase(word, 'peers'))
    .replace(/\bsibling\b/gi, (word) => withCase(word, 'peer'));
}

/**
 * Map the corpus wording onto the published one. Code blocks and inline code
 * are carried through untouched, so a capability name or a sample command in
 * the corpus keeps the letters its repository publishes.
 * @param {string} text
 * @returns {string}
 */
export function neutralize(text) {
  return text
    .split(CODE_SEGMENT)
    .map((segment, index) => (index % 2 === 1 ? segment : mapProse(segment)))
    .join('');
}
