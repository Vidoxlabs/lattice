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

## 2. Cloudflare Workers Builds

- [ ] Create or connect the `lattice` Worker in Cloudflare Workers Builds to
      `Vidoxlabs/lattice`.
- [ ] Production trigger: branch `main`, build command `npm ci && npm run check`, deploy
      command `npx wrangler deploy`.
- [ ] Preview trigger: non-`main` branches, same build command, deploy command
      `npx wrangler versions upload --preview-alias <branch-alias>`.
- [ ] Confirm `WORKERS_CI` is set in the build image. It is what makes `npm run check` run
      the browser stage; without it the stage is skipped and the build still passes.
- [ ] Confirm Chromium and WebKit provision in the build image. `npx playwright install
      --with-deps chromium webkit` runs inside `npm run test:browser`, and the build fails
      if a browser is unavailable rather than skipping the stage.
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

## 5. Chat

The defaults keep cloud models off, so no provider key is needed for the site to run.

- [ ] `CHAT_PROVIDER` (`mock` by default). `mock` answers deterministically from the
      documentation index and is what CI uses.
- [ ] `CHAT_ASSISTANT_NAME` — the display name, `Vidoxlabs assistant` by default.
- [ ] `CHAT_ALLOW_CLOUD` — `0`. A cloud provider answers only when this is `1` **and**
      `CHAT_ENDPOINT`, `CHAT_MODEL` and the secret below are set.
- [ ] `CHAT_ENDPOINT` and `CHAT_MODEL` — the endpoint and model name for the optional cloud
      provider chosen with `CHAT_PROVIDER` (an OpenAI-compatible server or Gemini). Document
      a local endpoint as `<your-endpoint>`.
- [ ] `CHAT_API_KEY` — the provider key, as a **secret** (`npx wrangler secret put
      CHAT_API_KEY`). Name only; never written down here.
- [ ] `CHAT_ALLOWED_ORIGINS` — leave unset for a same-origin site. Set it to widen the
      browser origins the chat accepts.

## 6. Rate-limit binding

- [ ] Bind `CHAT_RATE_LIMITER`: a Workers rate-limit binding with a namespace identifier
      and a limit of ten requests per minute per client key. The namespace identifier is an
      account-scoped value, so it cannot live in this public configuration file.
- [ ] Until the binding exists the Worker uses a documented best-effort per-isolate
      counter. Chat still works; the limit is weaker.

## 7. `SITE_ORIGIN`

- [ ] `SITE_ORIGIN` is `https://vidoxlabs.com` in `wrangler.jsonc` and drives canonical
      links, the sitemap, `robots.txt`, both language-model files and the social card URLs.
      Change it in the Wrangler variables, and for a build outside Workers Builds set the
      same value in the environment, or the built files will point at the default.

## 8. Domains and search submission

- [ ] Confirm both zones exist in the account with the nameservers the host expects. The
      deploy attaches `vidoxlabs.com`, `www.vidoxlabs.com`, `vidoxlabs.dev` and
      `www.vidoxlabs.dev` as custom domains; that is a deploy-time action and it also
      creates the DNS records. Do not pre-create conflicting records.
- [ ] The developer subdomain stays off, so the site answers only on the four custom
      domains. Preview addresses follow the setting in section 2.
- [ ] After the first production deploy, submit `https://vidoxlabs.com/sitemap.xml` in the
      search consoles you use. The sitemap is generated from the published routes, so it
      needs no maintenance.
- [ ] `www` and the `.dev` hosts redirect to the canonical host in the Worker; transport
      security is pinned on the canonical host only.

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
