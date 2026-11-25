# Owner setup

This checklist records only actions that require the owner or hosting access. Complete it after reviewing the open pull requests. Items are in the order they unblock work.

## Merge plan (start here)

- [ ] Merge order for lattice: **squash-merge #4 only**. It carries slices 1 to 4 in one commit and satisfies the required `check` on its own head. Then close #1, #2 and #3 unmerged (their heads are contained in #4's stack).
  - Alternative: if you prefer landing them one at a time, add the `check` workflow to #1 first, then merge #1 to #4 in order. Without that change #1 can never satisfy the required status check, because the branch predates the workflow.
- [ ] Merge order for docs: docs#6 is a proposal and stays open until you answer its three questions in the PR. The site works without it (status is labelled "gathered by the site" until then).

## Design system upstream

- [ ] videsign names some tokens after private team vocabulary at the pinned commit. The lattice publish filter renames those tokens to neutral aliases at sync time and the needle scan enforces it with no exemptions. If videsign later renames them upstream, the alias map in `scripts/sync-videsign.mjs` (digest-keyed) can be retired in the same change.

## Repository

- [ ] Create an organization team named `lattice-maintainers`, grant it write access to lattice, and uncomment the rule in `CODEOWNERS`.

## Cloudflare Workers Builds

- [ ] Create or connect the lattice Worker in Cloudflare Workers Builds to `Vidoxlabs/lattice`.
- [ ] Configure the preview trigger for non-main branches. Build command: `npm ci && npm run check`. Deploy command: `npx wrangler versions upload --preview-alias <branch-alias>`.
- [ ] Configure the production trigger for main. Build command: `npm ci && npm run check`. Deploy command: `npx wrangler deploy`.
- [ ] Confirm that `WORKERS_CI` is set and that Chromium and WebKit provisioning works in the build image. Browser installation or execution must fail the build if unavailable.
- [ ] Note: `assets.run_worker_first` is set to `true` on the Worker deploy so non-canonical hosts redirect on static pages. The runtime does not accept host-scoped pattern entries, so canonical-host requests also invoke the Worker. If host-based patterns are ever supported, switching to them saves those invocations.

## Later slices

The remaining checklist items (deploy hook secret, optional read token, chat variables, `SITE_ORIGIN`, custom domains, enrichment) arrive with the slices that need them; the final slice records the full list here.
