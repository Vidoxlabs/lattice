# Naming inventory: "family" in the site and its sources

Status: proposal. No visible copy changed in this run, and no other repository was touched.

Measured on 2026-11-25 at `b9ce248`, over every tracked file (`git ls-files`) and over the
built output in `dist/client`. The word is counted case-insensitively and every occurrence is
counted, not every line.

## What the word is actually doing

Two different uses share the spelling, and only one of them is the internal group name:

- **Ordinary vocabulary.** `font-family` in CSS, the `--vi-typography-typography-family-*`
  tokens, and "page family" or "brand family" where it means a set of pages or a set of brand
  files. Renaming these would churn the design system for no gain and would change nothing a
  reader sees.
- **The internal group name.** The repositories as "the family", the home page's "family
  stack", and the class and file names built from that. This is the one the owner wants
  product-neutral, and it is what the proposal below renames.

Of 239 tracked occurrences, 98 are the CSS vocabulary (68 `font-family`, 30 typography-token
uses), 20 are "page family"/"brand family" in the card and layout code, and the remaining 121
are the group name, the class names built from it, or prose in the docs corpus and the records.

## Inventory by source

| Source | Occurrences | Visible or internal | Owner |
| --- | --- | --- | --- |
| `src/data/snapshot/pipeline.json` | 53 | **visible** once rendered: docs prose, headings such as "The family", a link to `docs/family.md`, and one repository description ("Family documentation, synced from every public repository") | docs and the system repositories, mirrored here |
| `src/styles/videsign/core-components.css` | 30 | internal (28 `font-family`, 2 tokens) | videsign, synced copy |
| `src/styles/videsign/family-surfaces.css` | 22 | internal; the filename and the `.vi-fs-*` class names carry the group name, the rest is `font-family` and tokens | videsign, synced copy |
| `src/styles/videsign/specimen-layouts.css` | 10 | internal (5 `font-family`, 5 tokens) | videsign, synced copy |
| `src/styles/videsign/tokens.css` | 10 | internal: the persona alias tokens are named `family-a` to `family-d` by `scripts/sync-videsign.mjs` | videsign names, lattice aliases |
| `src/styles/chat.css` | 12 | internal (6 `font-family`, 6 tokens) | lattice |
| `src/styles/diagrams.css` | 10 | internal (5 `font-family`, 5 tokens) | lattice |
| `src/styles/docs.css` | 9 | internal (4 `font-family`, 4 tokens, one comment) | lattice |
| `src/styles/pages.css` | 6 | internal (3 `font-family`, 3 tokens) | lattice |
| `src/styles/global.css` | 3 | internal (one `@import` of `family-surfaces.css`, one token, one `font-family`) | lattice |
| `src/components/videsign/family-stack-diagram.astro` | 10 | **visible**: "The Vidoxlabs family stack" and "Around the family"; the rest are the component name, an element id, two data attributes and the ledger selector | videsign specimen, ported by lattice |
| `src/lib/brand-images.mjs` | 13 | internal; "page family" and "brand family" in the ordinary sense | lattice |
| `src/pages/index.astro` | 3 | internal (import and component name) | lattice |
| `src/pages/about.astro` | 1 | **visible**: "Multi-point family testing" | lattice |
| `src/layouts/BaseLayout.astro`, `src/layouts/DocsLayout.astro` | 5 | internal; the `family` prop names the page family used for the social card | lattice |
| `src/lib/content/render-docs.mjs`, `src/lib/agent/run.mjs`, `scripts/postbuild.mjs` | 4 | internal comments | lattice |
| `scripts/sync-videsign.mjs` | 6 | internal; the alias map (`family-a` to `family-d`) and the file list | lattice |
| `src/pages/docs/[...slug].astro`, `src/pages/repositories/[repo].astro` | 2 | internal; the page-family prop | lattice |
| `tests/unit/docs-corpus.test.mjs`, `tests/browser/diagrams.spec.mjs`, `tests/routes/social-cards.test.mjs`, `tests/unit/chat.test.mjs` | 16 | internal | lattice |
| `docs/work-record.md`, `docs/docs-timeline.md`, `docs/adr/0002`, `docs/adr/0003`, `AGENTS.md`, `SETUP.md`, `README.md` | 14 | internal records, read by a visitor to the repository rather than the site | lattice |

## What reaches a visitor

| Surface | Occurrences | Where it comes from |
| --- | --- | --- |
| Built pages | 1,883 visible-text occurrences across 133 pages: 1,864 in documentation pages, 16 in repository pages, 2 on the home page, 1 on the about page | the documentation pages are corpus prose; the home page and the about list are lattice's own |
| Built markup | 1,826 attribute occurrences | class names and `data-` attributes copied from videsign and used by lattice styles |
| `llms.txt` | 14 lines | repository summaries and page titles |
| `llms-full.txt` | 193 occurrences | the same docs prose, in full |
| Busiest pages | `/docs/trellis` (31), the five `/docs/trellis/evidence/family-grid-*` pages (22 or 23 each), `/docs/trellis/interop` and `/docs/drosera/interop` (20) | the docs corpus |

The home page is the only place where lattice writes the phrase itself; everywhere else the
visible text arrives from the corpus, so fixing it upstream fixes the site with no edit here.

## Proposed neutral vocabulary

| Now | Proposed | Where it lands |
| --- | --- | --- |
| "The Vidoxlabs family stack" | "The Vidoxlabs systems stack" | home diagram title |
| "Around the family" | "Around the stack" | home diagram group |
| `family-stack-diagram`, `data-vi-family-stack`, `data-family-stack-ledger`, `family-stack-title` | `systems-stack-diagram`, `data-vi-systems-stack`, `data-systems-stack-ledger`, `systems-stack-title` | component and tests |
| `.vi-fs-*`, `family-surfaces.css` | `.vi-ss-*`, `systems-surfaces.css` | videsign source, then the synced copy |
| `--vi-colors-persona-accent-family-a` to `-d` | one accent token per named role, or `accent-1` to `accent-4` | videsign tokens; the lattice alias map follows |
| "The family", "family documentation", `docs/family.md` | "The systems", "systems documentation", `docs/systems.md` | docs and the system repositories |
| Repository description "Family documentation, synced from every public repository" | "Systems documentation, synced from every public repository" | the docs repository settings |
| "the family packages", "the family's claim vocabulary" | "the pinned system packages", "the corpus claim vocabulary" | lattice comments |

"Vivarium systems" is the right phrase when the sentence is about Vivarium's seven systems.
"The Vidoxlabs stack" is the right phrase when the sentence is about the repositories as a set.
Neither is a substitute for the other, and neither should replace the ordinary "page family".

## Change order

1. **videsign first**: the token names, the `family-surfaces.css` filename and its `.vi-fs-*`
   classes. Everything downstream is generated from these, and the alias map in
   `scripts/sync-videsign.mjs` exists only because the current names are not neutral.
2. **docs second**: the prose and the file names (`docs/family.md` and the headings that point
   at it), then the repository description. The site renders whatever arrives, so it follows.
3. **lattice third**: the home diagram title and group, the about list, the component and test
   names, the comments, and finally the pinned hashes and the regenerated snapshot.
4. **Records last**: the ADR and timeline entries that describe the rename, written once the
   thing they describe exists.

Each step is a separate change in its own repository. Doing them in this order means no
downstream file is renamed twice and no digest is regenerated for a name that is about to
change again.

## Question for the owner

Rename the word now, or wait?

- **(a) Rename lattice-owned copy now.** The home diagram, the about line, the component and the
  test names, and the comments. The docs prose and the videsign classes stay until their owners
  move, so the site would carry both vocabularies at once and the home page would disagree with
  the pages it links to.
- **(b) Wait for one org-wide pass.** Change no visible copy now; the change order above is the
  pass, and this document is its plan. The site keeps one consistent, if older, vocabulary
  until every owner moves together.
- **(c) Keep the word.** It is understood internally and appears in the corpus anyway; treat it
  as ordinary language rather than internal vocabulary.

Recommendation and default taken: **(b)**. A half-renamed site reads worse than a consistently
old one, and the visible bulk is not lattice's to rename.

## Applied in this run

The one exception: the internal marker in the chat route read `TODO(family)`. It now reads
`TODO(upstream)` and lives beside the rate limiter it describes, in
`src/lib/agent/rate-limit.mjs`. Nothing else changed.

**Update, 2026-11-25, second run.** Default taken: option (a) for the three visible strings
this repository owns — owner decision pending. The home diagram title is "The Vidoxlabs
stack", its group heading is "Around the stack", and the about list line is "Multi-point
testing". The component name, the element id, the data attributes, the design-system files
and the corpus prose keep the current vocabulary until their owners move, so the counts
above predate this change. The docs prose now goes through the mapping below, which is
where the corpus side of this inventory is handled in the meantime.

## Lattice-side vocabulary mapping

The documentation corpus arrives from the other repositories, and some of its prose uses a
group word this site does not publish. The pipeline maps it in one place,
`src/lib/content/neutral-vocabulary.mjs`, applied to a text only after that text has verified
against its manifest digest — so verification still refers to the upstream bytes, and the
published output carries the mapped wording:

| Upstream | Published |
| --- | --- |
| "sibling" | "peer" |
| "siblings" | "peers" |
| "…, mirroring five flower-named personas." | the clause is dropped from the sentence |

The word maps whole only, and only in prose: fenced code blocks and inline code are carried
through untouched, so a capability name or a sample command in the corpus keeps the letters
its repository publishes. The mapping is lattice-side until the owning repositories change
their own text; when they do, the map, its tests and this row are retired with it. The
committed offline snapshot stores the mapped text; each manifest record in it keeps the
upstream digest and gains `storedSha256`, the digest of the stored text
(`scripts/snapshot-digests.mjs`), so the no-network fallback still verifies and a live
manifest can tell a fresh snapshot from a stale one.

## Related

- `Team and personas` does not appear on the site at all; this inventory is about the word
  "family" only.
- The public-safety scan already forbids the private team vocabulary. "family" is not on that
  list: it is ordinary English, which is why this is a naming proposal and not a scan failure.
