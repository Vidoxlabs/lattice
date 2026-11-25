# Work record

Public-safe running record for the first public deploy. A fresh agent resumes from this file,
never from recall. Update it in the same commit as the work it describes.

## Status

Step 3 of 10 (preview URLs) done; starting step 4 (Workers Builds readiness). Branch
`slice-10-finish`, pull request #10, currently a draft. Nothing is merged: `main` still holds
the initial commit.

Last pushed commit: `5abe25e` — fix: scope transport security to the canonical host.
The commit that carries this file is the next one on the branch, so a step's checklist entry
names the commit its work landed in rather than the commit that records it.

## Checklist

- [x] 1. Cleanup: delete the handoff file, rewrite this record, fail `npm run check` on merge-conflict markers in tracked text files — `500d2f5`
- [x] 2. Transport security: drop `includeSubDomains` from the header and from its unit test — `5abe25e`
- [x] 3. Preview URLs: `preview_urls` off until Access is on, a route test that pins the committed value, the owner's Access steps — this commit
- [ ] 4. Workers Builds readiness: browser install that works there, Node pin, dry runs, SETUP.md §2
- [ ] 5. Domains: the four hosts answer 301 to the canonical host, the redirect keeps nothing it should not, SETUP.md §8
- [ ] 6. Secrets and bindings: names only, where each goes, the commented rate-limit block, the unbound fallback test
- [ ] 7. Workflows: pinned actions, least privilege, `snapshot-refresh.yml`, `live-smoke.yml`, a workflow test
- [ ] 8. Self-update path: docs#6 stays a proposal, `scheduled-rebuild.yml` prepared inert, SETUP.md records it
- [ ] 9. Naming inventory: `docs/naming-inventory.md` as a proposal, the internal marker renamed
- [ ] 10. Finish: README and SETUP.md in deploy order, ADRs updated, timeline entries, #10 ready with a new body

## Next step

Work step 4: the Cloudflare Workers Builds image is documented without the system libraries
Playwright's browsers need and without root access, so the deploy default is the prepared
GitHub Actions workflow; finish the browser install script, pin Node through `.nvmrc`, write
SETUP.md section 2 and record the dry-run summaries.

## Owner steps ready

Each one is prepared in SETUP.md and waits for the owner; no agent takes it.

- [ ] §2 Workers Builds: connect the repository, the two triggers, the variables, the Node setting
- [ ] §3 Preview URLs: enable Cloudflare Access for this Worker's previews, then turn previews back on
- [ ] §4 Secrets and bindings: the chat variables, the `CHAT_API_KEY` secret, the rate-limit binding
- [ ] §5 Repository settings: allow Actions to create pull requests, `LIVE_SMOKE_ENABLED`, the optional read token
- [ ] §6 Domains and search: confirm both zones, remove conflicting records, verify with `curl -sI`, submit the sitemap
- [ ] §7 Scheduled rebuild: add the deploy-hook secret until the documentation repository notifies the site
- [ ] §8 Merge and publish order: round 1, round 2, then the publish sequence

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

## Open owner questions

- Redirect path handling (step 5): the canonical-host rule sends every alternate host to the
  home page. Options are (a) keep the home-page redirect, (b) keep the request path and drop
  the query string, (c) keep both path and query. Recommendation: (b), with the reasoning in
  section 5 of this record.

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
