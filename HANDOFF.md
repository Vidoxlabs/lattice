# Handoff

Public-safe resume point. Read this file first, then [docs/work-record.md](docs/work-record.md)
for the decisions log and the open owner questions.

The status line names the commit that was the branch tip when this file was written;
the commit that carries this file is the next one on the branch.

## Status

Step 7 of the slice 9 and 10 backlog, plus its first cloud-run fix. Branch `slice-09-seo`,
last pushed commit `99fb64b` (test: hold every page type inside its performance budget),
branched from the frozen `slice-08-chat` head. Pull request #9 is ready for review.

## Checklist

- [x] Step 0: resume and record — `4c9d59f` keeps the unfinished edits, `951e7a1` starts slice 9
- [x] Step 1: Worker bundle path cleanup, independent of the checkout folder name — `d478c5a`
- [x] Step 2: security headers and strict CSP on static and Worker responses — `34f6838`
- [x] Step 3: canonical links, generated sitemap and robots — `8aa33cf`
- [x] Step 4: generated `llms.txt` and `llms-full.txt` — `bc2e15a`
- [x] Step 5: production-only custom-domain routes — `fe30ad4`
- [x] Step 6: Open Graph images and tags — `48908ca`
- [x] Step 7: budget checks, then the slice 9 pull request goes ready for review — `99fb64b`, with the block ceiling relaxed for runner hardware in this commit
- [ ] Step 8: slice 10 — SETUP.md, ADRs, README, timeline, upstream items
- [ ] Step 9: docs#6 (blocked: the owner has not answered its three questions)
- [ ] Step 10: optional extras — snapshot refresh, CSP-safe highlighting, unported components

## Next step

Slice 9 is complete; the pull request is ready for review. Step 8: create `slice-10-finish`
from this head, open its draft pull request against `slice-09-seo`, then complete the
SETUP.md checklist in order, take ADR-0001 to accepted, reconcile ADR-0002 to ADR-0004,
refresh the README deployment section and what the site does, and add dated ET timeline
entries for slices 9 and 10.

## Open pull requests

| PR | Head | Base | CI |
| -- | ---- | ---- | -- |
| #9 | `slice-09-seo` (this branch) | `slice-08-chat` | ready for review |
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
