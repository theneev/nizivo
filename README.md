# Nizivo

Nizivo is an open-source React design system by Neev Technologies. It turns the Nizivo Figma library into framework-neutral design tokens, and pairs them with accessible, server-first React components and an icon set.

**Status: pre-release.** 0.2.0 is on npm. 0.x versions go to the `next` dist-tag, and a minor release may break (with a `BREAKING` note in the changelog).

## Packages

| Package                             | What it is                                                                                                     | First release |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------- |
| [`@nizivo/tokens`](packages/tokens) | Design tokens as CSS variables, theme scopes, motion and typed references. No runtime dependencies             | v0.1          |
| [`@nizivo/react`](packages/react)   | React components and their static CSS. Server Components by default; `'use client'` only on interactive leaves | v0.1          |
| [`@nizivo/icons`](packages/icons)   | Tree-shakable Lucide icons at the Figma stroke, plus brand glyphs                                              | v0.1          |
| [`@nizivo/charts`](packages/charts) | Server-rendered SVG charts with one small client island, themed by the tokens                                  | v0.2          |

All published packages are ESM-only, support Node `>=22.12`, and release together at the same version. `@nizivo/react`, `@nizivo/icons` and `@nizivo/charts` need React `^19.2.0`.

## Documentation

- The plan and every design decision: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- The public docs site will live at [nizivo.neevtechnologies.in](https://nizivo.neevtechnologies.in). Its source is [apps/docs](apps/docs): Fumadocs on Next.js, built as a static export. It is not hosted yet; `pnpm docs:check` builds and checks it locally ([apps/docs/RESULTS.md](apps/docs/RESULTS.md)).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup (Node 24 and pnpm 12.11.2 through corepack), the DCO sign-off, commit conventions and changesets. Please report security issues privately as described in [SECURITY.md](SECURITY.md).

## Licence

Copyright 2026 Neev Technologies. Licensed under the [Apache License 2.0](LICENSE). Items in [`patterns/`](patterns) are licensed under [MIT](patterns/LICENSE). "Nizivo" and the Nizivo logo are trademarks of Neev Technologies; see [TRADEMARKS.md](TRADEMARKS.md).
