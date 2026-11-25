# Contributing to lattice

Thank you for improving the Vidoxlabs website.

## Change content at its source

Documentation prose belongs in Vidoxlabs/docs or the repository that owns the synced page. Do not submit copied documentation text to lattice. Status, counts and diagrams must come from the content pipeline rather than manual edits.

For a documentation correction, use the page's **Edit upstream** link. For a rendering, accessibility, pipeline or interface defect, open a lattice issue with the affected route and evidence.

## Set up

1. Install the Node version in `.nvmrc`.
2. Run `npm ci`.
3. Create a focused branch.
4. Run `npm run check` before committing.

CI requires Chromium and WebKit. Local runs may skip browser tests only when neither `CI` nor `WORKERS_CI` is set; the command prints a notice when it skips them.

## Pull requests

Keep one concern per pull request. Explain the change, list verification, identify content-source changes, and note any owner setup. Use conventional commits without co-author trailers. Do not include secrets, personal handles, private paths or addresses, hosting identifiers, or preview and dashboard URLs.

All interface work follows the pinned videsign tokens and component contracts. Vivarium is the product; bloom is its interface.

## Security

Do not open a public issue for a suspected vulnerability. Follow [SECURITY.md](SECURITY.md).
