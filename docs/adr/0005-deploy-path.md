# ADR-0005: Deploy path, preview addresses and transport security

Status: accepted

Date: 2026-11-25

## Context

ADR-0001 assumed Cloudflare Workers Builds would build and deploy this repository. Three
facts arrived after it was written.

The browser stage is part of `npm run check`: the performance budgets, the policy sweep and the
canonical-host redirect all run through Chromium and WebKit. The published Workers Builds build
image documents Ubuntu 24.04 with a fixed package list, and that list carries `libgbm1` and the
build toolchain but not the libraries Chromium and WebKit link against. It also documents no
root access and no way to install a package, while Playwright installs those libraries through
the system package manager.

A preview upload gets its own address on the account's shared Workers subdomain. Nothing in the
build decides who can open it.

Transport security was pinned with `includeSubDomains`, which also pins every hostname under the
production domain, including ones this site does not serve.

## Decision

**Deploy from GitHub Actions.** Production deploys when `check` completes successfully on
`main`, whatever asked for that run: a push, the daily schedule, a manual run, or the
`docs-sync` repository dispatch the documentation repository will send once it can. The job
downloads the built output that run verified and runs
`npx wrangler deploy --config dist/server/wrangler.json`, so the bytes that deploy are the bytes
that passed. It runs in a GitHub environment named `production`, restricted to the default
branch, and both the account token and the account identifier are secrets inside that
environment rather than repository values: an identifier in a repository variable is readable by
every workflow and every reader of the settings page. The workflow is inert without both
secrets: it prints a notice and publishes nothing. Workers Builds stays documented as the
alternative, with its production and preview commands, and becomes the preferred path the moment
a first build there proves the browser stage.

**One browser install path.** `npm run test:browser` installs the engines itself. It adds the
system packages only where root exists, and it launches Chromium and WebKit once so a missing
library fails the build with the library named. A failed install fails the build; the stage is
never skipped silently, and no workflow installs browsers outside this script.

**Node comes from `.nvmrc`.** The build image reads that file, so the pin lives in one place and
no build variable duplicates it.

**Preview addresses stay off until they are gated.** `preview_urls` is `false` while previews
are public, and the route test follows whichever value is committed. The owner's step is to
enable Cloudflare Access for previews, limited to one address, and then flip that single line.

**Nothing keeps a credential in a checkout.** Every `actions/checkout` step sets
`persist-credentials: false`, and the one job that pushes a branch authenticates inside the step
that pushes.

**Transport security covers the canonical host alone.**
`Strict-Transport-Security: max-age=31536000`, without `includeSubDomains` and without
`preload`, and only on the canonical hostname. A subdomain added later does not inherit a pin
nobody decided.

**The canonical redirect keeps the path.** A `www` link is an ordinary way in, so the path
survives and the query string does not: no route reads a query string, and a parameter attached
to a foreign hostname does not become part of the canonical URL.

## Consequences

Deploying needs one repository secret, and the merge plan's publish step names it. The site does
not deploy until the token exists, which is deliberate and visible as a notice rather than a
failure.

The verified artifact is carried from `check` to `deploy` through an uploaded build output, so a
second build cannot quietly produce different bytes. That artifact is retained for seven days;
an older re-run would have to rebuild by hand.

Workers Builds remains a supported path, not a deprecated one. If a first build there passes the
browser stage, switching back is a settings change, not a code change.

A preview address that was already published stays reachable until the version is deleted, so
the setting is a brake rather than a cleanup.

## Alternatives

- **Workers Builds without the browser stage** (relying on the required check on every pull
  request): rejected. A deploy would then be possible from a build that never ran the budgets or
  the policy sweep, which is exactly what the deployment rule forbids.
- **Chromium on Cloudflare, both engines in Actions**: rejected as two deployment definitions
  that would drift, and as a weaker guarantee on whichever path ran first.
- **Keeping `includeSubDomains`**: rejected because it pins hostnames this site does not serve.
- **Sending every alternate host to the home page**: rejected because it breaks a deep link typed
  or shared against `www`.
- **`preview_urls: true` with instructions to remember Access**: rejected because the default is
  what ships when nobody remembers.
