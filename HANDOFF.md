# Handoff

Public-safe resume point. Read this file first, then [docs/work-record.md](docs/work-record.md)
for the decisions log and the open owner questions.

The status line names the commit that was the branch tip when this file was written;
the commit that carries this file is the next one on the branch.

## Status

Step 1 of the slice 9 and 10 backlog. Branch `slice-09-seo`, last pushed commit
`951e7a1` (docs: open the slice 9 hardening branch and record the resume point),
branched from the frozen `slice-08-chat` head. Pull request #9 is a draft.

## Checklist

- [x] Step 0: resume and record — `4c9d59f` keeps the unfinished edits, `951e7a1` starts slice 9
- [x] Step 1: Worker bundle path cleanup, independent of the checkout folder name — this commit
- [ ] Step 2: security headers and strict CSP on static and Worker responses
- [ ] Step 3: canonical links, generated sitemap and robots
- [ ] Step 4: generated `llms.txt` and `llms-full.txt`
- [ ] Step 5: production-only custom-domain routes
- [ ] Step 6: Open Graph images and tags
- [ ] Step 7: budget checks, then the slice 9 pull request goes ready for review
- [ ] Step 8: slice 10 — SETUP.md, ADRs, README, timeline, upstream items
- [ ] Step 9: docs#6 (blocked: the owner has not answered its three questions)
- [ ] Step 10: optional extras — snapshot refresh, CSP-safe highlighting, unported components

## Next step

Step 2: generate `dist/client/_headers` at build time and apply the same headers in the
Worker for `/api/status`, `/api/chat` and redirects: a strict CSP (`default-src 'self'`,
no `unsafe-inline`, no `unsafe-eval`, `frame-ancestors 'none'`, `base-uri 'none'`,
`form-action 'self'`), plus Referrer-Policy, X-Content-Type-Options, Permissions-Policy,
a cross-origin opener policy, and HSTS on the canonical production host only. Add the
CSP-violation browser test (all built pages, both engines) and the inline-script and
`style` attribute unit test, then run `CI=1 npm run check`, commit and push.

## Open pull requests

| PR | Head | Base | CI |
| -- | ---- | ---- | -- |
| slice 9 (draft) | `slice-09-seo` (this branch) | `slice-08-chat` | drafting |
| #8 | `slice-08-chat` `b2ca236` | `slice-07-docs` | check and CodeQL green, frozen |
| #7 | `slice-07-docs` `4d35926` | `slice-06-diagrams` | green, frozen |
| #6 | `slice-06-diagrams` `7a87b97` | `slice-05-pipeline` | green, frozen |
| #5 | `slice-05-pipeline` `5b5007c` | `slice-04-pages` | green, frozen |
| #4 | `slice-04-pages` `2cafb1e` | `main` | green, awaiting the owner |
| #3 | `slice-03-design-shell` `5dca41e` | `main` | blocked by design, close unmerged |
| #2 | `slice-02-ci-smoke` `596b56d` | `main` | blocked by design, close unmerged |
| #1 | `slice-01-bootstrap` `1bebb9a` | `main` | no check workflow, close unmerged |
| docs#6 | `site-status-pipeline` `a2c406b` | `main` | proposal, three owner questions open |

## Blocked or skipped

- Nothing skipped yet.
- `slice-09-recovered` (`4c9d59f`) holds the unfinished edits a previous session left
  uncommitted on `slice-08-chat`: a first pass at `_headers`, canonical and Open Graph
  tags, sitemap, robots, the two llms files and custom-domain routes. It is a salvage
  branch, never a merge candidate; take from it deliberately and re-verify anything taken.
