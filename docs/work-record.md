# Work record

Public-safe running record for the agent continuing this backlog. Update it in the same commit as any pushed work.

## Current slice and branch

Slice 4 fixes on `slice-04-pages`, then slice 5 (content and status pipeline) stacked on its head.

## Last pushed commit

`2cafb1e` — fix: run the canonical-host check ahead of static asset serving in the Worker entry (slice-04-pages, carries `690c937` cherry-picked CodeQL skip, `e45b059` browser-stage fix and `1f18e3f` publish filter).

## Next step

Open slice 5 on a new branch from the fixed slice-04 head, cherry-pick the recovered pipeline commit `4f46477` (on `slice-05-recovered`), rename `src/pages/api/status.mjs` to `.js` (the router ignores `.mjs` endpoints), and finish the pipeline slice against it.

## Defaults taken and open owner questions

- Scan exemptions (posted in chat): options were (a) drop or alias private tokens at sync time and enforce the needle scan with no exemptions, or (b) keep the exemptions and document them. Took (a). The upstream naming itself is a videsign matter, recorded in SETUP.md for the owner; nothing opened in videsign.
- `assets.run_worker_first` (posted in chat): the runtime rejects host-scoped pattern entries ("rules must start with /"), so the boolean `true` is used; every request invokes the Worker and non-canonical hosts redirect on static pages. Host patterns would spare canonical-host invocations if support ever arrives; noted in SETUP.md.
- Merge plan (posted in chat): the owner squash-merges #4 only (carries slices 1 to 4) and closes #1 to #3 unmerged; written into SETUP.md and the PR bodies. Alternative recorded there (add `check` to #1 and merge in order). Nothing merged by the agent.
- Astro endpoints must be `.js`: the router does not register `.mjs` files under `src/pages/` as endpoints (verified locally: a `.mjs` endpoint 404s, the same file as `.js` returns 200).
- Canonical-host rule shape: redirect only non-canonical hosts under the company's own domains; every other host (local previews, reserved example names) is served as-is. Tested with reserved example names.
- The browser stage runs `wrangler dev` on the generated deploy configuration instead of `astro preview`, because `astro preview` rejects foreign Host headers and never applies the deploy routing.
- Sleep-ban test moved to its own file with plain literals and a self-exclusion; it previously lived inside the no-TypeScript test assembled from pieces.
- Six stuck `check` runs on the old heads: two cancelled; the rest returned HTTP 500 from the cancel API (hung jobs). The 20-minute job timeout and the hang fix prevent recurrence; the old runs age out and do not block the required check on any new head.
- docs#6 questions are unanswered; the PR stays a proposal and no other docs PR is opened.
