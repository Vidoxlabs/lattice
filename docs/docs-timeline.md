# lattice development timeline

All dates use America/New_York (ET).

## 2026-11-25

- Slice 1: created the public repository, configured squash-only pull-request merges and main protections, and drafted the engineering and architecture records.
- Slice 2: added the pinned Astro and Cloudflare toolchain, CI, source and built-output scrubbing, a smoke page, route checks, and Chromium/WebKit coverage. Verified locally with two unit tests, one route test and two browser tests.
- Slice 3: pinned and synced videsign, added verified brand digests, ported the public shell components, added persistent light/dark and motion controls, and added raw-color, arbitrary-value and token-reference tests.
- Slice 4: added the complete public route set, digest-checked README summaries, the Vivarium pin table, repository filters and detail pages, canonical-host middleware, security.txt, and product-naming tests.
- Slice 4 fixes: the browser stage now runs the local Worker runtime in its own process group and exits with the test code, CI jobs carry a 20-minute timeout, the CodeQL skip for JavaScript-free heads is carried on the stack, the sleep-ban test moved to its own file, private design tokens are aliased at sync time with the needle scan enforced everywhere, and the canonical-host check runs ahead of static asset serving in a generated Worker entry with `run_worker_first`. Verified locally: `CI=1 npm run check` passes 9 unit, 5 route and 4 browser tests and exits in seconds with no leftover server processes; alternate hosts redirect 301 and the canonical host serves 200 under the local Worker runtime.
- Slice 5: added the build-time content and status pipeline: schema-validated manifest and status contracts (the status schema mirrors the docs#6 proposal at its commit and is labelled proposed), digest-verified README documents, the GitHub REST fallback labelled gathered by the site, the committed offline snapshot with its refresh command, the `/api/status` Worker route with Cache API caching and graceful degradation, and the client status refresh. Verified with `CI=1 npm run check`: 15 unit, 6 route and 10 browser tests on Chromium and WebKit, all passing; the canonical-host redirect is now active in the Worker deploy and covered by browser tests on both engines.
- Slices 6 through 10: pending. Each entry will record its verification receipt and pull request.
