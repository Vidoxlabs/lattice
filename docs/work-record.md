# Work record

Public-safe running record for the agent continuing this backlog. Update it in the same commit as any pushed work.

## Current slice and branch

Slice 5 (content and status pipeline) on `slice-05-pipeline`, stacked on the fixed `slice-04-pages` head.

## Last pushed commit

`bf02c10` — fix: finish the content pipeline on the Worker runtime with a proposed-mirror schema (branch also carries the recovered pipeline commit `5568397`).

## Next step

Open the slice 5 pull request against `slice-04-pages`, watch `check` on both branches, then start slice 6 (diagrams) from this branch's head: the `vi-orbital-field` and `family-stack-diagram` components, the §6.5 generators with text equivalents and visual tests in both themes.

## Defaults taken and open owner questions

- Scan exemptions (posted in chat): options were (a) drop or alias private tokens at sync time and enforce the needle scan with no exemptions, or (b) keep the exemptions and document them. Took (a). The upstream naming itself is a videsign matter, recorded in SETUP.md for the owner; nothing opened in videsign.
- `assets.run_worker_first` (posted in chat): the runtime rejects host-scoped pattern entries ("rules must start with /"), so the boolean `true` is used; every request invokes the Worker and non-canonical hosts redirect on static pages. Host patterns would spare canonical-host invocations if support ever arrives; noted in SETUP.md.
- Merge plan (posted in chat): the owner squash-merges #4 only (carries slices 1 to 4) and closes #1 to #3 unmerged; written into SETUP.md and the PR bodies. Alternative recorded there (add `check` to #1 and merge in order). Nothing merged by the agent.
- Astro endpoints must be `.js`: the router does not register `.mjs` files under `src/pages/` as endpoints (verified locally: a `.mjs` endpoint 404s, the same file as `.js` returns 200).
- Canonical-host rule shape: redirect only non-canonical hosts under the company's own domains; every other host (local previews, reserved example names) is served as-is. Tested with reserved example names.
- The browser stage runs `wrangler dev` on the generated deploy configuration instead of `astro preview`, because `astro preview` rejects foreign Host headers and never applies the deploy routing.
- Worker bundle hygiene: the framework manifest embeds absolute build-machine paths into the generated Worker bundle; `scripts/postbuild.mjs` rewrites them to a neutral root, a route test asserts the bundle carries no build-machine paths, and the whole-tree scan skips `dist/server` (framework-generated, never committed, never publicly served) while everything committed or publicly served stays fully scanned.
- Status schema label: mirrors the contract proposed in docs#6 at commit `a2c406b38483efece01a0925e77465f48cc35b58`, labelled a proposed mirror to be reconciled when the upstream schema publishes.
- The committed status snapshot was captured during the previous session; it is a labelled fallback only (`npm run snapshot:refresh` rewrites it) and was not re-captured to conserve the public API rate budget.
- Sleep-ban test moved to its own file with plain literals and a self-exclusion; it previously lived inside the no-TypeScript test assembled from pieces.
- Six stuck `check` runs on the old heads: two cancelled; the rest returned HTTP 500 from the cancel API (hung jobs). The 20-minute job timeout and the hang fix prevent recurrence; the old runs age out and do not block the required check on any new head.
- docs#6 questions are unanswered; the PR stays a proposal and no other docs PR is opened.
