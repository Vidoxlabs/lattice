# lattice workspace

lattice is a public repository. Every committed file, test fixture, commit message and pull request must be safe for public reading.

## Read order

1. This file.
2. `docs/adr/0001-stack.md` and the other architecture decisions.
3. `astro.config.mjs`, `wrangler.jsonc` and `package.json`.
4. `src/lib/content/` for the documentation and status contracts.
5. The videsign pin and synced component sources before changing interface work.

## One content path

A system's documentation changes upstream, the docs repository syncs it into `sources/<repo>/` and updates `manifest.json` and `status.json`, then one deploy hook rebuilds lattice. lattice reads prose only from Vidoxlabs/docs, never directly from a system repository. Public GitHub data supplies live status through docs and `/api/status`. No other repository triggers lattice.

Never hand-edit repository state into pages. Generate diagrams, counts, freshness and status from data. A manual update is a pipeline bug.

## Naming and claims

Vivarium is the product. bloom is Vivarium's user-interface system, not the product. docs is a separate, product-neutral hub. Product direction and specifications are labelled as direction or spec, never as shipped capability. Link factual claims to evidence and use the family labels: implemented, specified, planned, observed.

## Implementation rules

- JavaScript only: ESM `.mjs` and `.js`, plus `.astro` with JavaScript frontmatter and scripts. Do not add TypeScript source.
- Pin Node and family dependencies exactly. Use `npm ci` and keep the lockfile committed.
- Use synced videsign tokens and components. Do not introduce raw colours or arbitrary pixel values.
- Pages prerender by default. Only dynamic APIs and routes opt out.
- Keep client JavaScript same-origin, minimal, keyboard accessible and reduced-motion aware.
- Treat fetched content as untrusted. Verify digests, sanitize HTML and scan it before rendering.

## Verification

Run `npm run check` before every commit once the toolchain lands. It covers linting, JSDoc checking, unit tests, a build, public-safety scans, route and link checks, and browser tests under the browser policy. Do not weaken a check to make a change pass.

## Commits and pull requests

Use conventional commit messages. One concern per branch and pull request. No co-author trailers and no branch names in commit messages or pull-request titles. Never force-push, rebase a published branch, amend a pushed commit or rewrite history; fix forward. Never commit secrets, `.env` files or local credential files. Merging and production deployment are owner actions.

## Public safety

Do not commit workstation paths, personal handles, internal names, private network details, hosting account identifiers, dashboard or preview URLs, secret values, or external research-reference names. Document local model endpoints as `<your-endpoint>`. Run the scrub scan on source, built output and fetched documentation.
