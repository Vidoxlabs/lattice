# Work record

Public-safe running record for the first public deploy. A fresh agent resumes from this file,
never from recall. Update it in the same commit as the work it describes.

## Status

All ten steps done. Branch `slice-10-finish`, pull request #10, ready for review. Nothing is
merged: `main` still holds the initial commit.

Last pushed commit: `79f7f62` — docs: inventory the group name and propose a neutral vocabulary.
The commit that carries this file is the next one on the branch, so a step's checklist entry
names the commit its work landed in rather than the commit that records it.

## Checklist

- [x] 1. Cleanup: delete the handoff file, rewrite this record, fail `npm run check` on merge-conflict markers in tracked text files — `500d2f5`
- [x] 2. Transport security: drop `includeSubDomains` from the header and from its unit test — `5abe25e`
- [x] 3. Preview URLs: `preview_urls` off until Access is on, a route test that pins the committed value, the owner's Access steps — `9b64289`
- [x] 4. Workers Builds readiness: browser install that works there, Node pin, dry runs, SETUP.md §2 — `10a5a36`
- [x] 5. Domains: the four hosts answer 301 to the canonical host, the redirect keeps nothing it should not, SETUP.md §8 — `b7c6efd`
- [x] 6. Secrets and bindings: names only, where each goes, the commented rate-limit block, the unbound fallback test — `83c2628`
- [x] 7. Workflows: pinned actions, least privilege, `snapshot-refresh.yml`, `live-smoke.yml`, a workflow test — `f109d20`
- [x] 8. Self-update path: docs#6 stays a proposal, `scheduled-rebuild.yml` prepared inert, SETUP.md records it — `b9ce248`
- [x] 9. Naming inventory: `docs/naming-inventory.md` as a proposal, the internal marker renamed — `79f7f62`
- [x] 10. Finish: README and SETUP.md in deploy order, ADRs updated, timeline entries, #10 ready with a new body — this commit

## Next step

Nothing is left in this backlog. A fresh agent starts at SETUP.md section 1: the owner merges
#4 (round 1), then #10 is retargeted to `main` and brought up to date with a plain local merge
before round 2. Do not push to any other branch and do not merge anything.

## Owner steps ready

Each one is prepared in SETUP.md and waits for the owner; no agent takes it.

- [ ] Section 1: squash-merge #4, close #1 to #3, then review and squash-merge #10 and close #5
      to #9. Every merge is the owner's.
- [ ] Section 2, the deploy token: `CLOUDFLARE_API_TOKEN` as an Actions secret (and
      `CLOUDFLARE_ACCOUNT_ID` only if the token reaches more than one account). Until then the
      deploy job is inert.
- [ ] Section 2, previews: enable Cloudflare Access for the Worker's preview addresses, limited to
      the owner's email, then set `preview_urls` back to `true`.
- [ ] Section 2, alternative: connect Workers Builds with the production and preview commands if
      a first build there proves the browser stage.
- [ ] Section 3: create the deploy hook and decide whether the daily fallback runs here until
      docs#6 notifies the site itself.
- [ ] Section 5 and section 6: the chat and site variables, the `CHAT_API_KEY` secret, and the
      rate-limit binding with its account-scoped identifier.
- [ ] Section 8: both zones in one account, conflicting records cleared, the four `curl -sI`
      checks, then the sitemap submission.
- [ ] Section 11: allow Actions to create pull requests, add the `LIVE_SMOKE_ENABLED` variable,
      and confirm the maintainers team.
- [ ] Section 12: run the live smoke by hand once, then switch it on.
- [ ] Section 13: answer docs#6's three questions, and the upstream page and token-naming items.

## Defaults taken in this run

- Transport security (step 2, posted in chat): the header is `max-age=31536000` with
  `includeSubDomains` dropped and `preload` left out. The alternative is to keep
  `includeSubDomains` once every subdomain of the canonical domain is HTTPS by policy, which is
  not true today: the four hostnames are the only ones this site serves, and a subdomain added
  later for something else would inherit the pin without anyone deciding it.

- Preview URLs (step 3, posted in chat): `preview_urls` is committed as `false`, because an
  uploaded version gets a public address on the account's shared Workers subdomain unless
  Cloudflare Access protects it. The recommended path is to enable Access for previews,
  limited to the owner's email, and then flip the one line to `true`; leaving it off is the
  alternative, and production is unaffected either way.
- Deploy path (step 4, posted in chat): the Cloudflare Workers Builds image documents an
  Ubuntu 24.04 package list without the libraries Chromium and WebKit link against and
  documents no root access, while Playwright installs those libraries through the system
  package manager. The option that keeps the browser stage mandatory in every deploying build
  is (a): build and deploy from a GitHub Actions workflow on a successful `check` on `main`,
  using a Cloudflare API token secret. Taken, with `.github/workflows/deploy.yml` committed and
  inert until the secret exists. (b) would have accepted a deploy path with no browser stage,
  and (c) would have run one engine in one place and two in another; both were rejected
  because the rule is that every deploying build runs both.
- Browser install (step 4): `npm run test:browser` now installs the engines itself
  (`scripts/install-browsers.mjs`), adding the system packages where root exists and never
  asking for them where it does not, then launching Chromium and WebKit once so a missing
  library fails the stage with the library named. The workflow's separate `playwright install`
  step is gone, so every build takes the same path, and a failed install fails the build.
- Node pin (step 4): `.nvmrc` already carried `24.13.1`, and Workers Builds reads that file
  (the `NODE_VERSION` build variable overrides it), so no duplicate pin was added.
- Redirect path (step 5, posted in chat): the canonical-host rule now keeps the request path
  and drops the query string. A `www` link is an ordinary way in, so sending every deep link to
  the home page would break the link someone typed or shared; no route reads a query string, so
  a parameter attached to a foreign hostname does not become part of the canonical URL. Options
  were (a) keep the home-page redirect as specified, (b) keep the path and drop the query, or
  (c) keep both. Took (b).
- Rate limiter (step 6): the limiter moved to `src/lib/agent/rate-limit.mjs` so both paths are
  testable without the Workers runtime: a bound limiter decides, an unbound or broken one
  falls back to the per-isolate counter, which is weaker but keeps chat answering. The
  configuration carries the binding commented out with a `<namespace-id>` placeholder, because
  the identifier is account-scoped. `tests/unit/rate-limit.test.mjs` covers the limit, the
  reset, a bound answer, and the fallback; the route uses the same module, so the tested path
  is the shipped path.
- Secrets register (step 6): SETUP.md section 5 is now one table for every name, its home
  (Worker variable, Worker secret, Actions secret, Actions variable, docs repository secret),
  its default and the exact command or settings path. No value appears anywhere, and the
  account identifier stays a variable rather than a committed value.
- Setup section numbers (step 10): the numbers the instructions pinned stay pinned — section 2 is
  the build and deploy path, section 5 the secrets register, section 6 the binding, section 8 the
  domains. The publish order the owner follows is written at the top and again in section 1, so no
  numbering carries an instruction on its own.
- Decision record (step 10): the deploy, preview and transport decisions are recorded in a new
  ADR-0005 rather than by rewriting ADR-0001, because this repository's own rule is that a later
  change adds a record and ADR-0001 is accepted. ADR-0001 and ADR-0002 point at what changed.
- Team scrub scan (step 5): `node team/sync.mjs --scan` flags every URL in a file, including
  this site's own canonical hostnames, and exits non-zero on them, so it cannot gate a public
  repository that names its domains in prose and code. The repository's own scan
  (`scripts/scrub-scan.mjs`, plain patterns plus the hashed needle list, over source, built
  output and fetched content) is the enforced gate and passes; the team scan was run on every
  diff and reported only public hostnames and reserved example names.
- Workflows (step 7): `snapshot-refresh.yml` and `live-smoke.yml` join `check.yml`,
  `codeql.yml` and the new `deploy.yml`. Every action is pinned to a commit with its version
  beside it, every job states a timeout and its own permissions, and
  `tests/unit/workflows.test.mjs` parses all five with `yaml` (now a direct development
  dependency rather than a transitive one) and asserts the triggers, the permissions ceiling,
  the timeouts, the pinned actions, the live-smoke switch, the refresh's draft-pull-request
  path and the absence of a push to the default branch.
- Live smoke (step 7): the job is gated on the repository variable `LIVE_SMOKE_ENABLED`, checks
  the eight published surfaces, the policy and transport headers, the three redirecting hosts
  and one refused foreign-origin chat request with an empty message list, so no provider is
  ever prompted. A push to `main` waits for the deploy before checking.
- Self-update path (step 8, posted in chat): docs#6 still has no answers — zero comments and
  only an unrelated bot review — so nothing in the docs repository changed and no commit was
  made there. The fallback is a daily `scheduled-rebuild.yml` that posts to the same deploy hook
  from this repository, inert with a notice while `LATTICE_DEPLOY_HOOK_URL` is unset here.
  SETUP.md section 3 records that this deliberately keeps the hook in a second repository and
  that the workflow and its secret go away once docs#6 notifies the site.
- Naming inventory (step 9, posted in chat): `docs/naming-inventory.md` separates the ordinary
  vocabulary (`font-family`, the typography tokens, "page family") from the internal group name,
  counts both over every tracked file and over the built output, names an owner per group, and
  sets the change order: videsign names, then docs prose, then lattice copy. No visible copy
  changed. The one internal marker now reads `TODO(upstream)` and sits beside the rate limiter
  it describes.
- Dry runs (step 4): `npx wrangler deploy --dry-run` and `npx wrangler versions upload --dry-run`
  both resolved the redirected configuration at `dist/server/wrangler.json`, read 15 modules
  (2386.88 KiB) and 393 asset files, reported a 2388.10 KiB upload (696.01 KiB gzip) with the
  `ASSETS` binding and six variables, and exited without account access.

## Open owner questions

Each one has a default already taken, so nothing waits on an answer. A different answer is a
small follow-up change, named with each entry.

- Transport security (step 2): the header is `max-age=31536000` with `includeSubDomains` dropped
  and `preload` out. Options: (a) as taken, (b) keep `includeSubDomains` once every subdomain of
  the production domain is HTTPS by policy, (c) add `preload` as well. Recommendation: (a).
  Reverting is one line in `src/lib/security-headers.mjs` and its assertion.
- Preview addresses (step 3): `preview_urls` is `false`. Options: (a) as taken, until Cloudflare
  Access protects previews, then flip the one line; (b) enable Access and flip it now; (c) leave
  previews off permanently and review from the build log. Recommendation: (b) once Access is
  configured, because a reviewer being able to open a branch build is worth one policy.
- Browser path (step 4): deploy from GitHub Actions after `check` on `main`, with Workers Builds
  documented as the alternative. Options: (a) as taken; (b) Workers Builds without the browser
  stage, accepting that a deploy can come from a build that never ran it; (c) Chromium on
  Cloudflare and both engines in Actions. Recommendation: (a), because it is the only one where
  every deploying build runs both engines on the bytes that ship.
- Redirect path handling (step 5): the rule keeps the request path and drops the query string.
  Options: (a) keep the home-page redirect the previous spec described, (b) as taken, (c) keep
  the path and the query. Recommendation: (b). Reverting to (a) is one line in
  `src/lib/host.mjs` plus its two tests.
- Scheduled rebuild (step 8): with docs#6 unanswered, a daily job posts to the deploy hook from
  this repository. Options: (a) as taken; (b) no scheduled rebuild, so the site updates on the
  next build of any kind; (c) wait for docs#6. Recommendation: (a) while docs#6 stays open,
  because a stale site is otherwise invisible.
- The word "family" (step 9): no visible copy changed. Options: (a) rename the site's own copy
  now, (b) one org-wide pass in the order the inventory sets, (c) keep the word. Recommendation:
  (b), with the inventory as the plan.

## Earlier decisions (slices 1 to 10)

- Status snapshot refresh (attempted, not committed): `npm run snapshot:refresh` ran at 2026-11-25T18:03:21Z and produced no repository data — the unauthenticated public API window was closed (zero of sixty requests remaining), so every head came back empty and every CI conclusion came back unknown. The previous capture was kept, because replacing real data with empty values would degrade every status island. A refresh needs either a spare API window or `GITHUB_READ_TOKEN`; SETUP.md records the token.
- Syntax highlighting and the decorative documentation-portal components stay unported. The highlighter is off because the default one emits inline styles the policy forbids, and a class-emitting replacement is a self-contained change worth its own review rather than the tail of this run.
- Slice 10 records the operating contract as prose only: SETUP.md lists owner actions with variable and secret names and no values, and the upstream items name repositories and files without repeating the private vocabulary that makes those pages fail verification.
- The timeline gained one entry per slice for 2026-11-25 with the verification receipt each time; the pending line it replaced is gone.
- Performance budgets live in `tests/browser/budgets.json` and are enforced by the browser stage, which `npm run check` runs under CI. They cover nine representative routes across both engines rather than all 144 built pages, because a full sweep would add minutes to every run while the CSP sweep already loads every page; the file carries a `defaults` block that applies to any route added later. Measured before setting them: the home page 140 KB, 10 requests, 17 ms longest main-thread block; the other measured pages 100 to 118 KB, 7 to 8 requests, 17 to 18 ms. Budgets are those numbers plus roughly 15 to 20 percent, with three spare requests to spare. The first cloud runs showed the longest-block number is not usable as a budget: on the shared two-core runner the home page reported a 1.9 second first-frame gap, then 2.6 seconds on the next run, and 108 ms on another page — the runner's startup, not this site. Payload, request count and the count of tasks over 50 ms are enforced; the longest block is measured and printed in the failure message so it stays visible without failing a build for the runner's own scheduling.
- Social cards: one 1200x630 PNG per page family, rendered at build time from the committed brand SVGs with `sharp` pinned as a development dependency. A `-social` SVG already has the card aspect; a 4:1 dark banner is centred on a card canvas filled with the colour that banner paints itself, so no new palette is introduced. The alternative (serving the social SVGs as-is) was rejected because most crawlers do not render SVG previews, and the alternative of a bespoke new card artwork was rejected because brand art is synced and digest-checked.
- The brand inventory the layout needs is generated into `src/data/generated/` during the content build rather than read from `public/` at render time: the prerender step runs inside the Worker bundle, where the project directory is not readable.
- Custom-domain routes and the preview path: `wrangler versions upload` takes no route input and, per the current Cloudflare Workers documentation, routes and custom domains are changed by `wrangler deploy` only, so a preview version is served on its own preview URL and never claims the hostnames. Verified locally with `wrangler versions upload --config dist/server/wrangler.json --dry-run`, which compiles and exits without a route warning, and by reading the authorization table that lists route changes against `deploy`.
- The local runtime serves a configured custom domain itself and rewrites the request host, so with routes present the canonical-host redirect never ran in `wrangler dev` (verified: the alternate host answered 200 instead of 301). The build writes a second configuration without routes for the browser stage, the deploy configuration keeps them, and a route test asserts both shapes.
- `llms.txt` and `llms-full.txt` are generated in the build from the same pipeline bundle and repository catalog the pages render, so a sync updates both. A page that failed verification appears with its title, route and source only and contributes no body text. Both files are scanned by the public-safety check as part of the built output. The full text keeps the corpus markup minus banner and diagram wrappers rather than stripping all HTML, because stripping would also remove inline code and table sense from the prose.
- Sitemap source: the sitemap is derived from the HTML files the build actually published rather than from a hand-kept route list or a second traversal of the corpus, so a documentation sync appears in it with no edit. The robots file is generated from the same origin value; it excludes `/api/` and therefore the chat endpoint, while `/chat` stays published and listed.
- Canonical URLs come from `SITE_ORIGIN` with a trailing slash normalized away, and every page declares exactly one; a route test compares each page's declared canonical with its own published route so a wrong base cannot pass.
- Content security policy and the hero component (posted in chat): the synced web component builds a `<style>` block inside its shadow root, which a strict policy blocks. Options were (a) `unsafe-inline` (rejected: it is the thing the policy exists to prevent), (b) hash-list the block from the file the build ships, or (c) retire the component in favour of adopted stylesheets. Took (b): `src/lib/csp-hashes.mjs` derives `sha256-` sources from the shipped scripts and fails the build on an escaped block, so the hash can never be hand-written or stale. Everything else stays `'self'`, with no `unsafe-inline` and no `unsafe-eval`.
- Inline style attributes in fetched prose: the upstream renderer writes table alignment as a `style` attribute on `th` and `td`. Options were (a) strip the attribute and lose alignment, (b) convert the declaration to a `data-align` attribute the stylesheet selects on, or (c) widen `style-src`. Took (b); any other inline style, event handler or forbidden element is dropped.
- Third-party images in fetched prose: the corpus carries CI badges hosted by the code host. Options were (a) widen `img-src` to that host, (b) turn each image into a link that keeps its text, or (c) drop them. Took (b), with the badge-inside-link pair collapsed to one link at ingestion so no anchor nests, and an image path relative to the source repository dropped rather than published as a broken image.
- `_headers` versus the Worker: an asset rule cannot see the request host, so the asset file carries every header except transport security, and the generated Worker entry adds it only on the canonical production host. A route test asserts the asset file never carries it.
- Content store staleness: a renderer change did not invalidate the content layer's cached page, because the store is keyed by the entry digest, and the build silently published the previous markup twice during this run. `RENDER_REVISION` in `src/lib/content/render-docs.mjs` is now part of the digest and must be bumped whenever rendered markup changes.
- The built-page inline-markup test lives in the post-build route suite rather than the unit suite, because unit tests run before the build and the check refuses to inspect output that may not exist. It is still a plain assertion over every built page.
- Bundle path cleanup (posted in chat): options were (a) keep the `lattice` folder-name pattern and document that a differently named checkout leaks the path, or (b) read the project root from the working directory, rewrite both the plain path and the `file://` URL form, and fail the build if an occurrence survives. Took (b): the substitution lives in `scripts/bundle-hygiene.mjs`, a unit test proves it on a fixture whose folder is deliberately not called `lattice`, and the route test now asserts this build's real root and its `file://` URL are absent. Verified that the raw framework build embeds the root in two modules (three occurrences in `entry.mjs`) and that `postbuild` removes every one.
- `dist/server` in the plain-pattern scan: the generated framework bundle legitimately contains a loopback-hostname fallback and a documentation comment that shows a host with an explicit port, so adding it to the full pattern set would need exemptions. The scan exclusion stays and the assertion moves to the route test, which now also rejects home paths, preview hosts and hosting dashboards in the bundle, and walks the framework chunk directory the old top-level loop never saw.
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
