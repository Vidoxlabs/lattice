# Work record

Public-safe running record for the agent continuing this backlog. Update it in the same commit as any pushed work.

## Current slice and branch

Slice 9 (hardening, discoverability and domains) on `slice-09-seo`, branched from the
frozen `slice-08-chat` head; slice 8's pull request is #8 and is frozen for review.

## Last pushed commit

`b2ca236` — docs: record the slice 8 chat state (the frozen base of this branch).

## Next step

Work the backlog in `HANDOFF.md` in order, starting at step 1: the Worker bundle path
cleanup. Everything before it is recorded there. Do not push to `slice-01` to
`slice-08`; fix any defect they carry forward on the current branch instead.

## Defaults taken and open owner questions

- Bundle path cleanup (posted in chat): options were (a) keep the `lattice` folder-name pattern and document that a differently named checkout leaks the path, or (b) read the project root from the working directory, rewrite both the plain path and the `file://` URL form, and fail the build if an occurrence survives. Took (b): the substitution lives in `scripts/bundle-hygiene.mjs`, a unit test proves it on a fixture whose folder is deliberately not called `lattice`, and the route test now asserts this build's real root and its `file://` URL are absent. Verified that the raw framework build embeds the root in two modules (three occurrences in `entry.mjs`) and that `postbuild` removes every one.
- `dist/server` in the plain-pattern scan: the generated framework bundle legitimately contains a `localhost` fallback and an `example.com:8080` doc comment, so adding it to the full pattern set would need exemptions. The scan exclusion stays and the assertion moves to the route test, which now also rejects home paths, preview hosts and hosting dashboards in the bundle, and walks the framework chunk directory the old top-level loop never saw.
- Scan exemptions (posted in chat): options were (a) drop or alias private tokens at sync time and enforce the needle scan with no exemptions, or (b) keep the exemptions and document them. Took (a). The upstream naming itself is a videsign matter, recorded in SETUP.md for the owner; nothing opened in videsign.
- `assets.run_worker_first` (posted in chat): the runtime rejects host-scoped pattern entries ("rules must start with /"), so the boolean `true` is used; every request invokes the Worker and non-canonical hosts redirect on static pages. Host patterns would spare canonical-host invocations if support ever arrives; noted in SETUP.md.
- Merge plan (posted in chat): the owner squash-merges #4 only (carries slices 1 to 4) and closes #1 to #3 unmerged; written into SETUP.md and the PR bodies. Alternative recorded there (add `check` to #1 and merge in order). Nothing merged by the agent.
- Astro endpoints must be `.js`: the router does not register `.mjs` files under `src/pages/` as endpoints (verified locally: a `.mjs` endpoint 404s, the same file as `.js` returns 200).
- Canonical-host rule shape: redirect only non-canonical hosts under the company's own domains; every other host (local previews, reserved example names) is served as-is. Tested with reserved example names.
- The browser stage runs `wrangler dev` on the generated deploy configuration instead of `astro preview`, because `astro preview` rejects foreign Host headers and never applies the deploy routing.
- Worker bundle hygiene: the framework manifest embeds absolute build-machine paths into the generated Worker bundle; `scripts/postbuild.mjs` rewrites them to a neutral root, a route test asserts the bundle carries no build-machine paths, and the whole-tree scan covers exactly what git would publish plus the built output and the fetched-content bundle (local workspace overlays that git excludes are outside the scan and never committed).
- Visual checks assert structure and token-driven styling in both themes instead of pixel baselines: the diagrams are generated from live upstream data, so any baseline would break on every sync.
- The videsign ADR texts referenced as guidance for the homepage graphics are not present in the package or the repository at the pinned commit; the published specimens (preview markup, hero CSS, the orbital engine) stand in as the concrete guidance.
- Docs ingestion scope: the four structural portal components (layout, sidebar navigation, article meta, prose renderer) are ported with lattice CSS on videsign tokens; the decorative portal suite (command palette, code tabs, quickstart grid, citation popover, api rows, copy bar) stays unported and listed for a later visual-polish slice. Syntax highlighting is off because the default highlighter emits inline styles the strict content security policy forbids; code blocks render plainly.
- Eight upstream documentation pages (bloom's README and three backend pages, capillary's family page, seed's lexicon, videsign's README and design matrix) fail the public-safety scan at their source: they contain the private team vocabulary the needle list forbids. The site renders them as clearly labelled placeholders linking to the upstream file instead. The smallest upstream fix is to scrub those names in the owning repositories; out of scope for this run and noted for the owner.
- Mermaid blocks render as labelled source with a note (the allowed fallback): wiring a build-time static-SVG mermaid renderer for one block in the corpus was not worth a runtime dependency.
- The hub's own pages need one GitHub trees call per build; when the unauthenticated rate window is exhausted the corpus falls back to the snapshot, and when no snapshot pages exist either, the hub index renders a clearly labelled notice. A scheduled reminder refreshes the snapshot at the next rate window so the hub pages are committed.
- Chat status tools follow seed's tool-id grammar: the status face is `repos.read`, because "status" is not in the grammar's closed verb set. Capillary's literal search fans out per term for natural questions (the whole-phrase query matched nothing); packets and provenance still come from capillary. The rate-limit binding needs an account namespace identifier the public configuration file cannot carry, so the Worker uses it when bound and a documented best-effort per-isolate counter until then; SETUP.md records the owner step.
- Status schema label: mirrors the contract proposed in docs#6 at commit `a2c406b38483efece01a0925e77465f48cc35b58`, labelled a proposed mirror to be reconciled when the upstream schema publishes.
- The committed status snapshot was captured during the previous session; it is a labelled fallback only (`npm run snapshot:refresh` rewrites it) and was not re-captured to conserve the public API rate budget.
- Sleep-ban test moved to its own file with plain literals and a self-exclusion; it previously lived inside the no-TypeScript test assembled from pieces.
- Six stuck `check` runs on the old heads: two cancelled; the rest returned HTTP 500 from the cancel API (hung jobs). The 20-minute job timeout and the hang fix prevent recurrence; the old runs age out and do not block the required check on any new head.
- docs#6 questions are unanswered; the PR stays a proposal and no other docs PR is opened.
