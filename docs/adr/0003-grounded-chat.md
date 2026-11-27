# ADR-0003: Grounded documentation chat

Status: accepted

Date: 2026-11-25

## Context

The site ships a chat that answers questions about Vidoxlabs and Vivarium. It must improve by itself as documentation changes, never guess, and never send visitor material anywhere the operator has not opted into. The family already owns the contracts this needs: seed's provider seam, capillary's provenance-labelled retrieval and bounded packets, drosera's tool faces under seed's tool-id grammar. bloom owns the head-agent loop but ships an application, not a library.

## Decision

The chat is a Worker route, `POST /api/chat`, that speaks Server-Sent Events. A thin adapter in `src/lib/agent/` mirrors bloom's loop — brief, plan, tool calls, answer with citations — over the pinned family packages:

- retrieval searches the build-time documentation index through capillary's literal search and builds bounded packets (8,000 characters total, 4,000 per item) with provenance on every excerpt;
- the tool pack holds two read-effect faces under drosera's contract, `docs.search` and `repos.read`: `status` is not in the grammar's closed verb set, so the status face uses the read verb and the same identifier as the HTTP route it mirrors;
- providers follow seed's seam: the deterministic mock is the default and what CI uses; `CHAT_PROVIDER` selects an OpenAI-compatible server or Gemini, which answer only when `CHAT_ALLOW_CLOUD=1` with `CHAT_ENDPOINT`, `CHAT_MODEL` and the `CHAT_API_KEY` secret set, and only the visitor's message plus retrieved public excerpts ever reach them;
- the assistant's display name comes from `CHAT_ASSISTANT_NAME`, defaulting to "Vidoxlabs assistant"; no other name is hard-coded.

Abuse controls: the `CHAT_RATE_LIMITER` binding is used when the operator binds one (ten requests per minute per client key) and a best-effort per-isolate counter stands in until then; origins are limited to the site unless `CHAT_ALLOWED_ORIGINS` widens them; the body is capped at 8 kilobytes and 12 messages of 2,000 characters; the provider call carries a timeout; message bodies are never logged.

The streamed answer carries the same response headers as every other route, so the policy and the transport rules apply to the event stream as well. The chat page and the dock share one same-origin script, and the page's own connect target is the site.

Answers with no retrieval say so. Every answer streams its tool traces and citations before its text.

## Consequences

The chat is grounded in the same verified corpus as the pages, so it improves with every sync without manual work, and `llms-full.txt` gives an unauthenticated reader the same text without the round trip. Cloud models are opt-in and off in CI. The per-isolate rate counter is best-effort until the operator binds the limiter, which SETUP.md records. Family packages run on Workers under `nodejs_compat` as imported; the one Workers gap is the rate-limit binding's account namespace identifier, which the public configuration file cannot carry.

## Alternatives

- A client-side chat calling a provider directly: rejected because grounding, citations and abuse controls belong on the Worker.
- Waiting for bloom to export its loop: rejected as an unnecessary cross-repository dependency for a thin, well-specified loop.
