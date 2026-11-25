# Owner setup

This checklist records only the actions that need the owner: merging, hosting access, a
secret, or a decision this repository cannot make for itself. Every item is a checkbox, in the
order that unblocks the next one, and nothing here is done by an agent.

`docs/work-record.md` carries the running record, the defaults taken where a question was
answered provisionally, and the verification receipt for each step.

**The order to read and to act in**

1. Section 1 — merge the pull requests, then publish.
2. Section 2 — the build and deploy path, and Access for preview addresses.
3. Section 8 — the four hostnames and the sitemap.
4. Section 5 and section 6 — the variables, the one chat secret and the rate-limit binding.
5. Section 12 — run the live smoke once by hand, then switch it on.
6. Section 3 — how the site learns that the documentation changed, and the daily rebuild.
7. Section 13 — the documentation pull request that would replace that fallback.

## 1. Merge plan and the publish sequence

Two squash merges, in two rounds. Nothing else merges.

### Round 1: slices 1 to 4

- [ ] Reviews on head `e25d117` of #4: a ViGuard SAFE in ViGuard's own report file, a ViReview
      APPROVE, and, because this is interface work, a ViDesign ALIGNED.
- [ ] Squash-merge #4 with a clean title and body: sentence case, what changed, no branch
      names, no co-author trailers.
- [ ] Close #1, #2 and #3 unmerged with "Carried by #4" and nothing else. GitHub retargets #5 to
      `main` by itself; leave that alone.
  - Alternative, if #4 cannot be reviewed as one change: add the `check` workflow to #1 first,
    then merge #1 to #4 in order. Slower, same end state.

### Round 2: slices 5 to 10, plus this run

- [ ] Retarget #10 to `main`, then bring its head up to date with a plain local merge:
      `git fetch origin && git merge origin/main -m "merge: bring main up to date"`, and push.
      Never use the host's "Update branch" button: its commit message names branches, and a
      commit message in this repository never does.
- [ ] Confirm the merge changed nothing except what `main` legitimately carried:
      `git diff <head before the merge> HEAD` should be empty. Post that result with the
      review request.
- [ ] `check` and CodeQL green on the new head.
- [ ] Reviews on that exact head — ViGuard SAFE, ViReview APPROVE, ViDesign ALIGNED, scope
      `e25d117..<head>`. Any later push voids them, so push nothing after the reviews.
- [ ] Squash-merge #10 with a clean title and body.
- [ ] Close #5 to #9 unmerged with "Carried by #10" and nothing else.

### Then publish, in this order

- [ ] Enable Cloudflare Access for preview addresses, or leave previews off (section 2).
- [ ] Turn on the deploy path: the `production` environment with both account secrets for the
      committed GitHub Actions workflow (section 2, Path A), or Workers Builds if its first build
      proves the browser stage (section 2, Path B).
- [ ] Confirm the DNS records and attach the four hostnames (section 8).
- [ ] Set the variables, the one chat secret and the rate-limit binding (sections 5 and 6).
- [ ] Watch the first production build finish, and open the site.
- [ ] Run the live smoke once by hand, then set `LIVE_SMOKE_ENABLED` to `true` (section 12).
- [ ] Answer docs#6's three questions, or leave it a proposal and rely on the daily scheduled
      rebuild in section 3.

## 2. Workers Builds, and the deploy path this repository takes

One question decides the path: can the build run Chromium and WebKit? They are part of
`npm run check`, and a build that cannot run them must not deploy.

What the Cloudflare Workers Builds documentation says, checked on 2026-11-25:

- Builds run on Ubuntu 24.04 on x86_64 with a fixed package list. That list carries `libgbm1`
  and the build toolchain, but not the libraries Chromium and WebKit link against: no
  `libnss3`, no `libatk*`, no `libxkbcommon`, no `libwoff2`.
- Playwright installs those libraries through the system package manager, which needs root.
  The documentation publishes no root access and no way to install a package in the build.

Both engines therefore cannot be guaranteed there, so the committed default builds and
deploys from GitHub Actions, where the runner has root and the browser stage installs both
engines with their dependencies. That workflow is `.github/workflows/deploy.yml`, and it is
inert until one secret exists. The Workers Builds path stays below as Path B, and it is the
right answer the moment a first build there proves the browser stage.

### What the launch audit found, 2026-11-25

Checked read-only through the account's own API surface. Nothing was changed.

- [x] One account, and the credential in use is scoped to it. The plan carries Workers Paid.
- [x] No Worker named `lattice` exists, and no custom domain is attached to anything, so the
      first deploy creates the Worker and attaches the four routes in `wrangler.jsonc`.
- [x] Size does not constrain anything. The dry run reports 2388.80 KiB uncompressed and
      696.20 KiB gzipped. Since September 2026 only the uncompressed size is limited, at 64 MiB
      on every plan, so this bundle sits at about 3.6 percent of the limit.
- [x] Both paths publish the same built output. What differs is only where the browser stage
      runs, which is why Path A is committed and Path B is worth a try.

### Path A: deploy from GitHub Actions (the committed default)

The deploy job runs in a GitHub environment named `production`, and both account values are
secrets inside it. An environment secret is only visible to a job that names the environment, so
a workflow added later cannot read them by accident.

- [ ] Create an environment named `production` with a deployment branch rule that allows
      `main` and nothing else. The exact commands are under Prepared, not run, below.
- [ ] Add two environment secrets to it, both required:
      `CLOUDFLARE_API_TOKEN`, a user API token with Workers Scripts edit, Workers Routes edit for
      both zones and Zone read for both zones; and `CLOUDFLARE_ACCOUNT_ID`, the account
      identifier. The second is a secret, never a repository variable: an identifier in a
      variable is readable by every workflow and every reader of the settings page.
- [ ] Merge the pull request first: a `workflow_run` trigger fires only for a workflow that
      exists on the default branch.
- [ ] Then a run of `check` on `main` — from a push, the daily schedule, a manual run or the
      documentation repository's dispatch — uploads the built output, and `deploy` publishes
      exactly that output with `npx wrangler deploy --config dist/server/wrangler.json`. No build
      happens twice and no browser stage is skipped.
- [ ] With either value missing, the deploy job prints a notice, exits green and publishes
      nothing. It never deploys without both and never fails `check` for a missing one.
- [ ] If the environment also requires a reviewer, the deploy waits for that approval. That is a
      valid setting, and it makes the first publish a manual step.

### Path B: Workers Builds

- [ ] Create or connect the `lattice` Worker in Cloudflare Workers Builds to
      `Vidoxlabs/lattice`.
- [ ] Production trigger: branch `main`, build command `npm ci && npm run check`, deploy
      command `npx wrangler deploy`.
- [ ] Preview trigger: any other branch, same build command, deploy command
      `npx wrangler versions upload --preview-alias <branch-alias>`.
- [ ] Node version: Workers Builds reads `.nvmrc` at the repository root, and the
      `NODE_VERSION` build variable overrides it. `.nvmrc` is committed with `24.13.1`, so no
      variable is needed; a version the image does not preinstall is downloaded during the
      build.
- [ ] Variables: none are required to build. `CI` and `WORKERS_CI` are injected by the build
      image, and `WORKERS_CI` is what makes `npm run check` run the browser stage. Add
      `GITHUB_READ_TOKEN` only if the public API window runs out (section 4).
- [ ] A successful first build log reads, in this order:

      Detected the following tools from environment: nodejs@24.13.1, npm@...
      Installing project dependencies: npm clean-install
      Executing user build command: npm ci && npm run check
      Lint passed.
      ... one line per stage: content build, type check, unit tests, build
      Public-safety scan passed for ... files.
      ... the route test summary
      Chromium and WebKit are installed ... and both start.
      ... the browser summary: every test passing on both engines
      Executing user deploy command: npx wrangler deploy
      ... the upload summary and the deployed version

- [ ] If the browser stage fails, do not delete it, skip it or weaken it. Switch to Path A,
      which is already committed; the failed build is the evidence for the switch. The failure
      names the missing library, and `scripts/install-browsers.mjs` refuses to continue without
      both engines.
- [ ] Note: `assets.run_worker_first` is `true`, so every request invokes the Worker and
      non-canonical hosts redirect on static pages too. The runtime rejects host-scoped
      pattern entries, so this is the only form that keeps the redirect working. If
      host-based patterns ever become supported, switching saves those invocations.

### Preview URLs and Cloudflare Access

A preview build uploads a version, and a version gets its own address on the account's
shared Workers subdomain unless Cloudflare Access stands in front of it. This repository
therefore commits `"preview_urls": false`: a branch build still creates a version you can
inspect in the dashboard, but that version has no public address.

- [ ] Recommended: open the Worker in the dashboard, then **Settings → Domains & Routes →
      Preview URLs**, and enable Cloudflare Access for previews with one policy that allows
      your own email address and nobody else.
- [ ] Then turn the addresses back on: set `preview_urls` to `true` in `wrangler.jsonc`. That
      one line is the whole change; the next build applies it, and reviewers can open a
      branch preview.
- [ ] If you would rather not run Access, leave it at `false`. Production is unaffected, and
      a version is still there for you to inspect.
- [ ] A route test (`tests/routes/deploy-config.test.mjs`) pins whichever value is committed
      and fails if the source file and the built configuration disagree, so the switch can
      only be flipped deliberately.

### Prepared, not run

Nothing in this block has been executed. Each line is an owner action.

- [ ] Create the deploy token: dashboard, My Profile, API Tokens, Create Custom Token, named
      `lattice-deploy`, with Workers Scripts: Edit, Workers Routes: Edit, and Zone: Read scoped
      to both zones. Through the API the same token is `POST /accounts/<account>/tokens` with
      those three permission groups and the two zone resources. The identifiers are exactly
      the values this repository cannot hold, so the dashboard is the shorter route.
- [ ] Create the environment and add its two secrets. Both commands prompt for the value and
      neither accepts it on the command line:

      gh api -X PUT repos/:owner/:repo/environments/production
      gh secret set CLOUDFLARE_API_TOKEN --env production
      gh secret set CLOUDFLARE_ACCOUNT_ID --env production

- [ ] Then restrict that environment's deployment branch rule to `main`. The call above
      creates the environment without branches; the rule is one edit under Settings,
      Environments, and it is what keeps a future workflow from reading the secrets.
- [ ] First production publish: run `check` on `main` and let the `deploy` job it triggers do
      it. By hand the equivalent pair is `npm ci && CI=1 npm run check`, then
      `npx wrangler deploy --config dist/server/wrangler.json`.

## 3. How the site learns that the documentation changed

The site rebuilds on its own: `check` carries a daily schedule, so the pages, the sitemap, both
language-model files and the diagrams are regenerated once a day whether or not anything asks.
That is the current answer while the documentation repository cannot notify it. The intended
answer is one event, and no deploy hook exists anywhere in this repository.

- [ ] Nothing to create today. There is no deploy hook to hold and no second secret to copy.
- [ ] The intended caller is `Vidoxlabs/docs` after a sync, once docs#6 lands and its three
      questions are answered. That pull request is still a proposal, so nothing sends the event
      today.
- [ ] When it lands: the docs workflow posts a repository dispatch to `Vidoxlabs/lattice` with
      event type `docs-sync`, using a token held in the docs repository as
      `LATTICE_DISPATCH_TOKEN` (contents write on this repository, nothing else). `check` accepts
      that event on the default branch, runs the full check, and `deploy` publishes on success,
      exactly as it does for a push.
- [ ] The event carries nothing but its type: no branch name, no path, no payload to validate.
      The site rebuilds from what the last sync published, so the event only has to say "look
      again".
- [ ] Until then the daily schedule is the whole mechanism, and a push to `main` also rebuilds.
      A stale site is a missed run, not a wrong page.

## 4. Optional read token

- [ ] `GITHUB_READ_TOKEN` is optional. Set it as a build secret if the unauthenticated
      GitHub API window runs out during builds: the content build uses it when present and
      falls back to the committed snapshot when the window closes.

## 5. Secrets and variables

Names only. No value belongs in this file, a commit, a log or a chat message. "Worker variable"
is set in `wrangler.jsonc` under `vars`, or in the dashboard at **Settings → Variables &
Secrets**; "Worker secret" is set with the command shown, or on the same dashboard page; an
Actions secret or variable is set in this repository under **Settings → Secrets and variables
→ Actions**.

| Name | Where | Default | How |
| --- | --- | --- | --- |
| `CHAT_PROVIDER` | Worker variable | `mock` | Committed in `wrangler.jsonc`. Set `openai-compatible` or `gemini` for a cloud provider. |
| `CHAT_MODEL` | Worker variable | unset | Dashboard. Required by a cloud provider; the model name only. |
| `CHAT_ENDPOINT` | Worker variable | unset | Dashboard. Required by a cloud provider; a local server is written `<your-endpoint>`. |
| `CHAT_ASSISTANT_NAME` | Worker variable | `Vidoxlabs assistant` | Committed. The only place the display name is set. |
| `CHAT_ALLOW_CLOUD` | Worker variable | `0` | Committed. A cloud provider answers only when this is `1` **and** `CHAT_ENDPOINT`, `CHAT_MODEL` and `CHAT_API_KEY` are set. |
| `CHAT_ALLOWED_ORIGINS` | Worker variable | unset (same origin) | Dashboard. Comma-separated origins, for a widget served from somewhere else. |
| `CHAT_API_KEY` | Worker secret | unset | `npx wrangler secret put CHAT_API_KEY` |
| `CHAT_RATE_LIMITER` | Worker binding | unbound | Section 6; uncomment the block in `wrangler.jsonc` and replace the placeholder. |
| `SITE_ORIGIN` | Worker variable | `https://vidoxlabs.com` | Committed. Drives canonical links, the sitemap, `robots.txt`, both language-model files and the social card URLs. |
| `GITHUB_READ_TOKEN` | Build secret | unset | Section 4; a build secret in Workers Builds, or an Actions secret on the deploy path, or an environment variable for a local build. |
| `ENRICH_ENABLED` | Worker variable | `0` | Committed. Leave at `0`; ADR-0004 records why. |
| `ENRICH_MAX_USD` | Worker variable | `0` | Committed. A positive cap is required before an enabled run does anything. |
| `CLOUDFLARE_API_TOKEN` | Actions secret in the `production` environment, required | unset | Section 2, Path A. Deploy only. |
| `CLOUDFLARE_ACCOUNT_ID` | Actions secret in the `production` environment, required | unset | Section 2, Path A. A secret and never a variable, so only the deploy job can read it. |
| `LATTICE_DISPATCH_TOKEN` | Docs repository secret | unset | Section 3 and section 13. It lives in `Vidoxlabs/docs` and never here, and it exists only after docs#6 lands. |

The defaults keep cloud models off, so the site runs with no provider key at all: `mock`
answers deterministically from the documentation index, and that is what every test and
workflow uses. Turning a cloud provider on is a per-deployment decision: set
`CHAT_ALLOW_CLOUD=1` with `CHAT_ENDPOINT`, `CHAT_MODEL` and the `CHAT_API_KEY` secret, then
send one question and confirm the answer arrives with citations. Set `CHAT_ALLOW_CLOUD` back
to `0` to turn it off; the mock is the fallback whenever a value is missing, and the route
reports which one answered.

`SITE_ORIGIN` is the one variable that changes what the build emits, so a build outside the
committed default has to set it too; section 7 covers that case.

## 6. Rate-limit binding

`POST /api/chat` allows ten requests per minute per client key. The binding counts across
isolates and survives a restart; without it the route keeps a best-effort per-isolate counter,
so chat still answers and the limit is weaker. The namespace identifier is account-scoped, so
the public configuration carries the block commented out with a placeholder:

```jsonc
  // "ratelimits": [
  //   {
  //     "name": "CHAT_RATE_LIMITER",
  //     "namespace_id": "<namespace-id>",
  //     "simple": { "limit": 10, "period": 60 }
  //   }
  // ],
```

- [ ] Uncomment the block, replace `<namespace-id>` with the identifier from the account, and
      deploy. The binding can also be added in the dashboard under **Settings → Bindings**,
      which keeps the identifier out of the repository entirely; either way it is not a value
      that belongs in a commit.
- [ ] Verify afterwards that the eleventh request in a minute from one client answers 429 with
      a `Retry-After` header.
- [ ] `tests/unit/rate-limit.test.mjs` covers both paths: the counter refuses the request after
      the tenth, the window resets after sixty seconds, a bound limiter's answer is used as-is,
      and a limiter that throws falls back to the counter instead of failing the request.

## 7. A build outside the deploy path

Neither path above is required to check the site by hand, but a hand build has to set what the
deploy path provides.

- [ ] Use the Node version in `.nvmrc` and `npm ci`, then `npm run check`. Without `CI=1` the
      browser stage is skipped with a notice rather than failing; set `CI=1` to run it.
- [ ] Set `SITE_ORIGIN` in the environment if the build should point anywhere other than
      `https://vidoxlabs.com`, or the emitted canonical links, sitemap, `robots.txt`, both
      language-model files and social card URLs keep the committed value.
- [ ] Deploy from the repository root: `npx wrangler deploy` reads the configuration the build
      generates at `dist/server/wrangler.json`, which carries the host entry. The same command
      with `--dry-run` prints the upload summary without an account, and
      `npx wrangler versions upload --dry-run` does the same for a preview version.
- [ ] A preview version from a workstation claims no hostname: version uploads never attach
      routes. It still produces an address unless `preview_urls` is `false`, which is the
      committed setting (section 2).

## 8. Domains, DNS and search submission

`https://vidoxlabs.com` is canonical. The other three hostnames answer a 301 to it from the
Worker's host check, which runs before any asset is served. All four are custom-domain routes
in `wrangler.jsonc`, so a deploy attaches them and nothing else does.

### What the launch audit found, 2026-11-25

Read-only, through the account's own API surface. Nothing was changed.

- [x] Both zones are in the account that will hold the Worker, both active, neither paused.
- [x] Each apex carries mail records only: no A, AAAA or CNAME at the root of either zone.
- [x] `vidoxlabs.com`, `www.vidoxlabs.com` and the `vidoxlabs.dev` apex are clear. Three of the
      four hostnames need nothing removed before the attach.
- [ ] `www.vidoxlabs.dev` carries an existing proxied A record. The documented refusal is for
      an existing CNAME, and a host record on the same name is not a clean state either:
      remove it before the first deploy, then confirm the name has no record at all.
- [x] No Worker exists, so no custom domain is attached yet, and the first deploy performs all
      four attaches itself.

- [ ] The first production deploy then attaches four custom domains and provisions their
      certificates. Until a certificate is issued the host answers a TLS error, not a redirect,
      so give it a few minutes before treating a failure as a defect.
- [ ] Verify each hostname, and the canonical host, with the response headers only:

      curl -sI https://www.vidoxlabs.com/     # 301, location: https://vidoxlabs.com/
      curl -sI https://vidoxlabs.dev/         # 301, location: https://vidoxlabs.com/
      curl -sI https://www.vidoxlabs.dev/     # 301, location: https://vidoxlabs.com/
      curl -sI https://vidoxlabs.com/         # 200, strict-transport-security: max-age=31536000

- [ ] A deep link keeps its path, and a query string is not carried across:

      curl -sI https://www.vidoxlabs.com/vivarium        # location: https://vidoxlabs.com/vivarium
      curl -sI 'https://vidoxlabs.dev/docs?from=share'   # location: https://vidoxlabs.com/docs

- [ ] Transport security is pinned on the canonical host only, and without `includeSubDomains`,
      so no other hostname under the domain inherits it.
- [ ] The developer subdomain stays off, so the site answers only on the four custom
      domains. Preview addresses follow the setting in section 2.
- [ ] After the first production deploy, submit `https://vidoxlabs.com/sitemap.xml` in the
      search consoles you use. The sitemap is generated from the published routes, so it needs
      no maintenance and a documentation sync appears in it with no edit.

### Prepared, not run

Nothing in this block has been executed.

- [ ] Delete the one conflicting record. Dashboard: DNS, Records, zone `vidoxlabs.dev`, delete
      the proxied A record on `www`. Through the API, resolve it by name and delete by the
      identifier the lookup returns, so no identifier has to be written down anywhere:

      GET    /zones/<zone>/dns_records?name=www.vidoxlabs.dev
      DELETE /zones/<zone>/dns_records/<record>

      Then repeat the GET and expect an empty list.
- [ ] Attach the four custom domains. This needs no command of its own: `npx wrangler deploy`
      reads the four `custom_domain` routes and creates them. One at a time, the dashboard
      path is Settings, Domains & Routes, Add, Custom Domain.
- [ ] Confirm the attaches with the header checks above, allowing a few minutes for the
      certificates. Expect four domains and four certificates, and no preview address.

## 9. Enrichment

- [ ] Leave `ENRICH_ENABLED` at `0` and `ENRICH_MAX_USD` at `0`. The enrichment hook is
      specified and disabled: with the flag off, the corpus and the rendered pages are
      identical to a build without the module. Turning it on is a separate decision
      (ADR-0004) and needs a provider key and a positive cost cap.

## 10. Design system upstream

- [ ] The pinned design-system release names some tokens after private team vocabulary.
      This site renames those tokens to neutral aliases at sync time and the public-safety
      scan enforces it with no exemptions. If the design system renames them upstream, the
      alias map in `scripts/sync-videsign.mjs` can be retired in the same change.

## 11. Repository settings

- [ ] Create an organization team named `lattice-maintainers`, grant it write access to this
      repository, and uncomment the rule in `CODEOWNERS`.
- [ ] Settings → Actions → General → Workflow permissions: allow GitHub Actions to create and
      approve pull requests. Without it the weekly snapshot refresh can push its branch but the
      pull request it opens is refused.
- [ ] A pull request opened with the workflow token does not start other workflows, so `check`
      will not run on the refresh branch by itself. Re-run it from the Actions tab, or close and
      reopen the pull request, before treating that pull request as reviewed.
- [ ] Add the repository variable `LIVE_SMOKE_ENABLED` with the value `true` after the first
      production deploy. Section 12 covers what it turns on.
- [ ] The `production` environment from section 2 is the other setting this repository expects:
      both account secrets live there, and its deployment branch rule allows `main` alone.
- [ ] No bypass is needed for the refresh: its pull request goes through the same rules and the
      same required check as any other.

## 12. Live smoke

`.github/workflows/live-smoke.yml` checks the deployed site from outside. On the canonical host
it expects the eight published surfaces to answer 200, the policy and transport headers to be
present, and transport security to carry no subdomain pin. It expects the three alternate
hostnames to answer 301 to the canonical home, and a chat request from a foreign origin to be
refused. It sends no question to any provider: the request is an empty message list from a
foreign origin, which the origin rule rejects first.

- [ ] After the first production deploy, run it once by hand: Actions → live-smoke → Run
      workflow, and expect every check to pass.
- [ ] Then set the repository variable `LIVE_SMOKE_ENABLED` to `true`. Until then its only job
      is skipped, which keeps a repository without a deployment quiet.
- [ ] It then runs every six hours, on demand, and after each successful deploy on `main` — not
      on the push, because a smoke that starts with the build checks the version that is still
      live. It waits for the site to answer before checking anything, so a deploy that is still
      propagating does not report a failure.

## 13. Upstream items for you

Each one is a decision in another repository; this repository works around all three.

- [ ] Eight documentation pages fail the public-safety scan at their source and render as
      labelled placeholders. The fix belongs in the owning repositories; the pages are
      listed by repository and file only:
  - `Vidoxlabs/bloom`: `README.md`, `docs/backend/agent-runtime.md`,
    `docs/backend/research/agent-runtime-patterns.md`,
    `docs/backend/research/implementability-review.md`
  - `Vidoxlabs/capillary`: `docs/family.md`
  - `Vidoxlabs/seed`: `docs/lexicon.md`
  - `Vidoxlabs/videsign`: `README.md`, `DESIGN.md`
- [ ] Design-system token naming: the aliases in `scripts/sync-videsign.mjs` exist because
      of the naming upstream. Neutral names there remove the mapping.
- [ ] docs#6: answer its three questions in the pull request. On a yes to all three, the site's
      status schema is reconciled with the published one, the docs workflow posts the
      `docs-sync` dispatch described in section 3 after each sync, and the daily schedule becomes
      a safety net rather than the only trigger.
- [ ] The word "family": `docs/naming-inventory.md` lists every group, an owner for each, a
      neutral vocabulary and the order to change in — videsign names, then docs prose, then the
      site's own copy. No visible copy changed in this run.
