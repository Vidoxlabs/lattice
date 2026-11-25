<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Vidoxlabs/.github/main/profile/vidoxlabs-banner-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/Vidoxlabs/.github/main/profile/vidoxlabs-banner-light.svg">
  <img alt="Vidoxlabs" src="https://raw.githubusercontent.com/Vidoxlabs/.github/main/profile/vidoxlabs-banner-dark.svg">
</picture>

# lattice

[![check](https://github.com/Vidoxlabs/lattice/actions/workflows/check.yml/badge.svg)](https://github.com/Vidoxlabs/lattice/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

lattice is the Vidoxlabs website for Vivarium, the open, local-first personal agent platform. It renders the documentation hub and public repository evidence, presents the seven systems and bloom as Vivarium's interface, and keeps live status and grounded chat on one content path.

## Develop

Use the Node version in `.nvmrc`, then run:

```sh
npm ci
npm run check
```

The site renders documentation from Vidoxlabs/docs. It never edits that content or hand-maintains repository state. See [CONTRIBUTING.md](CONTRIBUTING.md) and [the architecture decisions](docs/adr/README.md).

## Deployment

Preview and production builds run through Cloudflare Workers Builds. Owner connection steps, environment variable names, and the pull-request merge order live in [SETUP.md](SETUP.md) when the final setup slice lands.

## Links

- [Vivarium](https://github.com/Vidoxlabs/vivarium)
- [Documentation hub](https://github.com/Vidoxlabs/docs)
- [Design system](https://github.com/Vidoxlabs/videsign)
- [Public component preview](https://vidoxlabs.github.io/videsign)
- [Security reports](SECURITY.md)
