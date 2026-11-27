# ADR-0004: Optional documentation enrichment hook

Status: accepted (the hook is specified and disabled; no provider is wired)

Date: 2026-11-25

## Context

Deterministic presentation templates already render every synced page from verified digests. An optional enrichment step could later restructure selected pages into richer presentations (for example a workflow description into an interactive diagram specification). It must never change what the site claims, never run unnoticed, and never reprocess unchanged pages.

## Decision

Enrichment is a build-time hook over the prepared corpus, off unless `ENRICH_ENABLED` is `1`. A run carries a hard cost cap through `ENRICH_MAX_USD`; without a positive cap an enabled run is still a no-op. Results are cached by each source file's manifest digest, so unchanged pages never re-run. Enrichment may only restructure or visualize what the source already says: every enriched block keeps its source citation, and a test compares the enriched page's text claims against the source. The deterministic templates always run first and enrichment only adds to them.

The committed hook is a disabled stub with exactly this contract: with the flag off, the corpus, the build and the rendered pages are identical to a build without the module. `ENRICH_ENABLED` and `ENRICH_MAX_USD` are declared in the Worker variables at `0`, so an operator can see the switch is off without reading this record. A provider wiring is a future decision record.

Enriched output would have to satisfy the same policy as every other rendered page: no inline script, no inline style attribute, no third-party image. A future wiring that cannot meet that is not admissible under the current stack.

## Consequences

The build stays deterministic and auditable while the option remains open. Turning enrichment on later means setting `ENRICH_ENABLED`, `ENRICH_MAX_USD` and a provider key, and accepting the cost cap. Until then the site renders only verified upstream text through deterministic templates.

## Alternatives

- Enrichment at request time: rejected because it would put provider latency and cost into every page view.
- No hook at all: rejected because the option keeps the pipeline ready without adding runtime risk.
