# ADR-0002: One content and status pipeline

Status: accepted

Date: 2026-11-25

## Context

The site must update because upstream documentation and public repository state changed, not because a person edited a page or prompted an agent. The documentation hub already mirrors prose and records source heads and file digests. Its status publication and rebuild notification are proposed in Vidoxlabs/docs#6 but are not yet implemented.

## Decision

Vidoxlabs/docs is the only source of documentation prose. A prebuild step fetches and validates `manifest.json`, fetches `vivarium.json` for product pins, and verifies every rendered document against its manifest digest and the public-safety rules. A missing or mismatched digest produces no prose.

The same step reads `status.json` when docs publishes it. Until then, lattice gathers the equivalent fields from public GitHub REST endpoints and labels the result `gatheredBy: site`. Both JSON inputs are validated with Ajv against versioned schemas. The local status schema mirrors the contract proposed in Vidoxlabs/docs#6 at commit `a2c406b38483efece01a0925e77465f48cc35b58` and is labelled a proposed mirror until that pull request merges and publishes the upstream schema; it is then reconciled with the published form.

One generated build bundle feeds static pages and `/api/status`. The API refreshes only head, CI conclusion and last push, uses the Cache API for five minutes, and returns build-time fields on errors or rate limits. A small same-origin client refreshes visible status islands without changing layout.

A committed, dated snapshot contains the last successfully refreshed manifest, pins, status and verified README documents. Offline builds use it and display its capture date. `npm run snapshot:refresh` is the only command that updates this snapshot.

After the docs proposal is ratified and implemented, a docs sync that changes the manifest or status will make one optional deploy-hook request. No system repository will trigger or push content to lattice.

## Consequences

The build is deterministic for a fixed set of upstream responses and has an explicit offline mode. Generated data is not hand-maintained. Ajv adds one runtime build dependency; it is not used by browser code. Until the docs proposal lands, status collection consumes more public API requests and the local fallback contract may need a migration to the ratified schema.

## Alternatives

- Hand-written schema subset checks: rejected because silent validator drift would weaken the content boundary.
- Direct repository documentation fetches: rejected because docs is the single content path.
- Client-only status gathering: rejected because it would expose rate limits to every visitor and lose the stable build-time fallback.
