<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Vidoxlabs/.github/main/profile/vidoxlabs-banner-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/Vidoxlabs/.github/main/profile/vidoxlabs-banner-light.svg">
  <img alt="Vidoxlabs" src="https://raw.githubusercontent.com/Vidoxlabs/.github/main/profile/vidoxlabs-banner-dark.svg">
</picture>

# lattice

[![check](https://github.com/Vidoxlabs/lattice/actions/workflows/check.yml/badge.svg)](https://github.com/Vidoxlabs/lattice/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

lattice is the Vidoxlabs website for Vivarium, the open, local-first personal agent platform.

## What the site does

- **Renders the documentation hub.** It reads prose only from Vidoxlabs/docs, verifies every
  page against its manifest digest and the public-safety rules, and renders it with the
  design system at a pinned commit. A page that fails verification becomes a labelled
  placeholder that links upstream rather than stale text.
- **Shows public repository evidence.** Each system has a page with its synced README, its
  pinned commit, its CI conclusion and its documentation freshness, all derived from data.
- **Draws the system map and the pipeline**, generated at build time from the same data, each
  with a text equivalent.
- **Serves live status** at `/api/status` from the build bundle, refreshing only head, CI and
  last push, with a committed snapshot as the offline fallback.
- **Answers questions** at `/chat` from the same verified corpus, with citations and tool
  traces, using a deterministic mock by default and a cloud provider only when an operator
  turns one on.
- **Describes itself to crawlers and models**: canonical links, a generated sitemap and
  robots file, `llms.txt` and `llms-full.txt`, and a generated social card per page family.

Every one of those comes from data, not from an edit: a documentation sync changes the
pages, the sitemap, both language-model files and the diagrams together.

Security posture: one strict content security policy on every response, static or dynamic,
with no `unsafe-inline` and no `unsafe-eval`; transport security pinned on the canonical
host; canonical-host redirects for the company's other domains; and a public-safety scan
over source, built output and fetched content on every run.

## Develop

Use the Node version in `.nvmrc`, then run:

```sh
npm ci
npm run check
```

`npm run check` runs linting, the content build, type checking, the unit tests, the build,
the public-safety scan, the route tests and — under `CI=1` or `WORKERS_CI=1` — the browser
stage on Chromium and WebKit. It also enforces the performance budgets in
`tests/browser/budgets.json` and fails on any content security policy violation on any built
page.

The site renders documentation from Vidoxlabs/docs. It never edits that content or
hand-maintains repository state. See [CONTRIBUTING.md](CONTRIBUTING.md) and
[the architecture decisions](docs/adr/README.md).

## Deployment

Preview and production builds run through Cloudflare Workers Builds against this
repository:

| Trigger | Build command | Deploy command |
| --- | --- | --- |
| `main` | `npm ci && npm run check` | `npx wrangler deploy` |
| any other branch | `npm ci && npm run check` | `npx wrangler versions upload --preview-alias <branch-alias>` |

The build produces static assets plus one Worker script. The Worker applies the canonical
host rule and the response headers ahead of the framework handler, because the framework
serves a matched static asset without running page middleware. `wrangler.jsonc` carries the
production custom domains; a version upload never attaches them, so a preview keeps its own
address.

Everything the owner has to do — the merge order, the build connection, the deploy hook in
the documentation repository, the optional read token, the chat variables and the secret by
name, the rate-limit binding, `SITE_ORIGIN`, the domains and the decisions that belong
upstream — is in [SETUP.md](SETUP.md).

## Links

- [Vivarium](https://github.com/Vidoxlabs/vivarium)
- [Documentation hub](https://github.com/Vidoxlabs/docs)
- [Design system](https://github.com/Vidoxlabs/videsign)
- [Public component preview](https://vidoxlabs.github.io/videsign)
- [Security reports](SECURITY.md)
