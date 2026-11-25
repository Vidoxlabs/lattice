# ADR-0001: Astro on Cloudflare Workers

Status: accepted

Date: 2026-11-25

## Context

lattice needs content collections, Markdown rendering, file-based routes, build-time SVG and
static output with zero client JavaScript by default. It also needs same-origin dynamic
status and chat endpoints. The interface must use videsign at an exact commit and run under
a strict content security policy without inline scripts.

## Decision

Use current stable Astro with the official Cloudflare adapter, ESM JavaScript and `.astro`
files, deployed as a Cloudflare Worker with static assets. Prerender pages by default and
opt dynamic routes out individually. Pin Node 24 LTS and videsign by commit. All third-party
packages are pinned exactly and the lockfile is committed.

The stack that shipped:

| Piece | Pin | Role |
| --- | --- | --- |
| Node | 24.13.1 | runtime for the build and the tooling |
| Astro | 7.4.13 | routing, content collections, Markdown |
| `@astrojs/cloudflare` | 14.4.9 | Worker adapter, asset binding, prerender step |
| `wrangler` | 4.168.0 | local runtime, deploy and version upload |
| `@playwright/test` | 1.65.1 | Chromium and WebKit browser stage |
| `ajv` | 8.20.0 | schema validation of the docs contracts |
| `sharp` | 0.35.5 | build-time social cards from the brand SVGs |
| `tailwindcss` | 3.4.19 | the design-system build |
| videsign | `08707d6…` | tokens and components, synced by `npm run videsign:sync` |

No client UI framework and no TypeScript source: the site is content-first, and the only
client scripts are small same-origin modules for theme, motion, status refresh and chat.

`npm run build` is two steps: the framework build, then `scripts/postbuild.mjs`, which
prepares what the framework does not emit. Postbuild writes the generated Worker entry (the
canonical-host rule plus the response headers), the asset header file, the sitemap, the
robots file, both language-model files and the social cards, and it rewrites the project
path out of the generated Worker bundle.

## Consequences

One build produces static pages and Worker routes. Browser checks run against built output
through the local Worker runtime. CSP, asset and compatibility requirements are tested
rather than assumed. Any concrete adapter blocker requires a new decision record and an
explicit alternative.

The framework handler serves matched static assets before page middleware runs, so a
canonical-host check inside page middleware can never see a prerendered request.
`scripts/postbuild.mjs` therefore generates a Worker entry that applies the host rule first
and delegates to the framework handler, and sets `assets.run_worker_first: true` on the
Worker deploy configuration so every request reaches that entry. The runtime rejects
host-based `run_worker_first` pattern entries (rules must start with `/`), so the boolean
form is the only one that keeps non-canonical hosts redirecting; canonical-host requests
also invoke the Worker as a result. An assets-only build (every route prerendered) ships no
Worker script, carries no host entry, and is asserted as such until the first
non-prerendered route lands. API endpoints must use `.js` filenames: the router does not
register `.mjs` files under `src/pages/` as endpoints.

The same entry applies the response headers to every route, including the streamed chat
answer and the redirect, so a dynamic response cannot ship without the policy. The header
definition lives in one module, and the build derives the one hash-listed style block from
the file it ships rather than from a hand-written hash.

Custom-domain routes make the local runtime answer the configured host itself, which hides
the canonical-host redirect from the browser stage. Postbuild therefore writes a second copy
of the deploy configuration without routes for the browser stage; the deploy configuration
keeps them, and a route test asserts both shapes.

Browser tests spawn `wrangler dev` on that generated configuration, in its own process
group, parse the printed origin from its startup output, and terminate the group before
exiting with the test exit code.

Where the build runs is decided in ADR-0005: a GitHub Actions run deploys the output that
`check` verified, and Workers Builds remains the alternative path with its commands documented.
The browser stage installs Chromium and WebKit itself and fails the build when either cannot
start, because a build that cannot run them must not deploy.

The content layer caches a rendered page by its entry digest, so a change to the renderer
alone would reuse the cached page. The digest carries `RENDER_REVISION` from
`src/lib/content/render-docs.mjs`, which is bumped whenever rendered markup changes.

## Alternatives

- A hand-written Worker: rejected because routing, Markdown, sitemap and asset pipelines
  would need custom infrastructure.
- A client application framework: rejected because the site is content-first and needs no
  framework runtime by default.
- Serving the sitemap and language-model files from a hand-kept list: rejected because a
  documentation sync must update them with no edit. They are derived from the published
  routes and the verified corpus.
