# Owner setup

This checklist records only actions that need the owner, hosting access or a decision this
repository cannot make for itself. Items are in the order that unblocks work: the merge
plan first, then the build pipeline, then the runtime configuration, then the decisions.

Nothing here is done by an agent. Merging, deploying, sending a deploy hook and changing
DNS are owner actions.

## 1. Merge plan (start here)

- [ ] Squash-merge **#4 only**. It carries slices 1 to 4 in one commit and satisfies the
      required `check` on its own head. Then close #1, #2 and #3 unmerged: their heads are
      contained in #4's stack and #1 predates the workflow the required check needs.
  - Alternative: add the `check` workflow to #1 first, then merge #1 to #4 in order.
- [ ] Then merge #5, #6, #7, #8, #9 and #10 in that order, one at a time. Each later pull
      request is retargeted to `main` by the host when the one before it lands, and each
      needs a plain merge of `main` into its head to satisfy the strict status check. No
      rebase, no force push.
- [ ] Merge order for docs: docs#6 is a proposal and stays open until you answer its three
      questions in the pull request. The site works without it: status is labelled
      "gathered by the site" or read from the committed snapshot until then.

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

### Path A: deploy from GitHub Actions (the committed default)

- [ ] Add the repository secret `CLOUDFLARE_API_TOKEN`: a user API token with Workers Scripts
      edit, Workers Routes edit for both zones, and Zone read for both zones.
- [ ] Add the repository variable `CLOUDFLARE_ACCOUNT_ID` only if the token can reach more
      than one account. It is an identifier, so it belongs in the variable and never in a file.
- [ ] Merge the pull request first: a `workflow_run` trigger fires only for a workflow that
      exists on the default branch.
- [ ] Then every push to `main` runs `check` in full, uploads the built output, and `deploy`
      publishes exactly that output with `npx wrangler deploy --config dist/server/wrangler.json`.
      No build happens twice and no browser stage is skipped.
- [ ] With no token, the deploy job prints a notice, exits green and publishes nothing. It
      never deploys without a token and never fails `check` for a missing one.

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

## 3. Deploy hook in the documentation repository

- [ ] Create a deploy hook URL for the Worker and store it as `LATTICE_DEPLOY_HOOK_URL` in
      the `Vidoxlabs/docs` repository only. It is a secret; it is not set in this
      repository, not committed, and not read here.
- [ ] The hook is called once per docs sync, after `manifest.json` and `status.json` are
      written. Until docs#6 lands nothing calls it, and the site updates on the next build.

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
| `CLOUDFLARE_API_TOKEN` | Actions secret | unset | Section 2, Path A. Deploy only. |
| `CLOUDFLARE_ACCOUNT_ID` | Actions variable | unset | Section 2, Path A, only when the token reaches more than one account. |
| `LATTICE_DEPLOY_HOOK_URL` | Docs repository secret | unset | Section 3 and section 9. It lives in `Vidoxlabs/docs`, never here. |

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

- [ ] Both zones, `vidoxlabs.com` and `vidoxlabs.dev`, must be in the same Cloudflare account
      as the Worker. A custom domain in a different account cannot be attached by this deploy,
      and the failure looks like a permissions error rather than a missing zone.
- [ ] Before the first production deploy, remove or confirm absent any existing DNS record for
      the four hostnames: check DNS → Records in each zone for `@`, `www`, and the corresponding
      `.dev` names. A custom domain creates its own records, and an existing A, AAAA or CNAME
      record on the same name makes the attach fail instead of being overwritten.
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

## 11. Repository access

- [ ] Create an organization team named `lattice-maintainers`, grant it write access to
      this repository, and uncomment the rule in `CODEOWNERS`.

## 12. Upstream items for you

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
- [ ] docs#6: answer its three questions in the pull request. On a yes to all three, the
      site's status schema is reconciled with the published one and the deploy hook in
      section 3 starts rebuilding the site after each sync.
