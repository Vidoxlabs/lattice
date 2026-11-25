# Owner setup

This checklist records only actions that require the owner or hosting access. Complete it after reviewing the open pull requests. The final slice adds the full merge order, deploy hook, domains, chat and enrichment items.

## Repository

- [ ] Create an organization team named `lattice-maintainers`, grant it write access to lattice, and uncomment the rule in `CODEOWNERS`.

## Cloudflare Workers Builds

- [ ] Create or connect the lattice Worker in Cloudflare Workers Builds to `Vidoxlabs/lattice`.
- [ ] Configure the preview trigger for non-main branches. Build command: `npm ci && npm run check`. Deploy command: `npx wrangler versions upload --preview-alias <branch-alias>`.
- [ ] Configure the production trigger for main. Build command: `npm ci && npm run check`. Deploy command: `npx wrangler deploy`.
- [ ] Confirm that `WORKERS_CI` is set and that Chromium and WebKit provisioning works in the build image. Browser installation or execution must fail the build if unavailable.
