# Work record

Public-safe running record for the agent continuing this backlog. Update it in the same commit as any pushed work.

## Current slice and branch

Slice 6 (diagrams) on `slice-06-diagrams`, stacked on `slice-05-pipeline`.

## Last pushed commit

`d1a3250` — feat: generate data-driven diagrams and port the orbital hero and family stack.

## Next step

Push this branch, open its pull request against `slice-05-pipeline`, watch `check`, then start slice 7 (docs ingestion) from this head: the content loader, navigation with the Vivarium section, source labels, presentation templates, the search index at `src/data/docs-index.json`, ADR-0004 and the disabled enrichment stub.

## Defaults taken and open owner questions

- Scan exemptions (posted in chat): options were (a) drop or alias private tokens at sync time and enforce the needle scan with no exemptions, or (b) keep the exemptions and document them. Took (a). The upstream naming itself is a videsign matter, recorded in SETUP.md for the owner; nothing opened in videsign.
- `assets.run_worker_first` (posted in chat): the runtime rejects host-scoped pattern entries ("rules must start with /"), so the boolean `true` is used; every request invokes the Worker and non-canonical hosts redirect on static pages. Host patterns would spare canonical-host invocations if support ever arrives; noted in SETUP.md.
- Merge plan (posted in chat): the owner squash-merges #4 only (carries slices 1 to 4) and closes #1 to #3 unmerged; written into SETUP.md and the PR bodies. Alternative recorded there (add `check` to #1 and merge in order). Nothing merged by the agent.
- Astro endpoints must be `.js`: the router does not register `.mjs` files under `src/pages/` as endpoints (verified locally: a `.mjs` endpoint 404s, the same file as `.js` returns 200).
- Canonical-host rule shape: redirect only non-canonical hosts under the company's own domains; every other host (local previews, reserved example names) is served as-is. Tested with reserved example names.
- The browser stage runs `wrangler dev` on the generated deploy configuration instead of `astro preview`, because `astro preview` rejects foreign Host headers and never applies the deploy routing.
- Worker bundle hygiene: the framework manifest embeds absolute build-machine paths into the generated Worker bundle; `scripts/postbuild.mjs` rewrites them to a neutral root, a route test asserts the bundle carries no build-machine paths, and the whole-tree scan covers exactly what git would publish plus the built output and the fetched-content bundle (local workspace overlays that git excludes are outside the scan and never committed).
- Visual checks assert structure and token-driven styling in both themes instead of pixel baselines: the diagrams are generated from live upstream data, so any baseline would break on every sync.
- The videsign ADR texts referenced as guidance for the homepage graphics are not present in the package or the repository at the pinned commit; the published specimens (preview markup, hero CSS, the orbital engine) stand in as the concrete guidance.
- Status schema label: mirrors the contract proposed in docs#6 at commit `a2c406b38483efece01a0925e77465f48cc35b58`, labelled a proposed mirror to be reconciled when the upstream schema publishes.
- The committed status snapshot was captured during the previous session; it is a labelled fallback only (`npm run snapshot:refresh` rewrites it) and was not re-captured to conserve the public API rate budget.
- Sleep-ban test moved to its own file with plain literals and a self-exclusion; it previously lived inside the no-TypeScript test assembled from pieces.
- Six stuck `check` runs on the old heads: two cancelled; the rest returned HTTP 500 from the cancel API (hung jobs). The 20-minute job timeout and the hang fix prevent recurrence; the old runs age out and do not block the required check on any new head.
- docs#6 questions are unanswered; the PR stays a proposal and no other docs PR is opened.
