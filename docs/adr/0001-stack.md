# ADR-0001: Astro on Cloudflare Workers

Status: draft

Date: 2026-11-25

## Context

lattice needs content collections, Markdown rendering, file-based routes, build-time SVG and static output with zero client JavaScript by default. It also needs same-origin dynamic status and chat endpoints. The interface must use videsign at an exact commit and run under a strict content security policy without inline scripts.

## Decision

Use current stable Astro with the official Cloudflare adapter, ESM JavaScript and `.astro` files, deployed as a Cloudflare Worker with static assets. Prerender pages by default and opt dynamic routes out individually. Pin Node 24 LTS and videsign by commit. The videsign pin is recorded in `src/styles/videsign/PIN` when the token slice lands.

Use npm with a committed lockfile and minimal dependencies. Do not add a client UI framework or TypeScript source. Keep build-time content and diagram generation in JavaScript modules.

Pin videsign as a development dependency at `08707d61780ab2c873ac51cbfd39f2b29abfce9a`. `npm run videsign:sync` runs its token generator and fail-closed consumer sync from that pinned package, then copies the companion artifacts and brand files. This avoids sibling-checkout and manual-copy drift.

## Consequences

One build produces static pages and Worker routes. Browser checks run against built output through the local Worker runtime. CSP, asset and compatibility requirements are tested rather than assumed. Any concrete adapter blocker requires a new decision record and an explicit alternative.

The framework handler serves matched static assets before page middleware runs, so a canonical-host check inside page middleware can never see a prerendered request. `scripts/postbuild.mjs` therefore generates a Worker entry that applies the host rule first and delegates to the framework handler, and sets `assets.run_worker_first: true` on the Worker deploy configuration so every request reaches that entry. The runtime rejects host-based `run_worker_first` pattern entries (rules must start with `/`), so the boolean form is the only one that keeps non-canonical hosts redirecting; canonical-host requests also invoke the Worker as a result. An assets-only build (every route prerendered) ships no Worker script, carries no host entry, and is asserted as such until the first non-prerendered route lands. API endpoints must use `.js` filenames: the router does not register `.mjs` files under `src/pages/` as endpoints.

Browser tests spawn `wrangler dev` on the generated deploy configuration, in its own process group, parse the printed origin from its startup output, and terminate the group before exiting with the test exit code.

## Alternatives

- A hand-written Worker: rejected because routing, Markdown, sitemap and asset pipelines would need custom infrastructure.
- A client application framework: rejected because the site is content-first and needs no framework runtime by default.
