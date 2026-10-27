# Registry fixture: results

The copy-paste registry's fixture (ARCHITECTURE.md §19.3, K13; D-dj), first run in v0.3 week 7
(2026-10-27). `fixtures/runner/registry.ts` builds the registry as the docs build does
(`apps/docs/scripts/registry.ts`), serves it from 127.0.0.1, and runs the shadcn CLI's `add` with
every item's URL in a Vite app on the **packed** packages. Lane `fixture-registry`.

**Verdict: all 99 items install; the CLI writes all 120 files byte for byte at their targets, and
the app typechecks (`skipLibCheck: false`), builds with no warning and renders every example of the
23 patterns with each pattern's stylesheet applied and no page error.**

## Setup

|          |                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI      | shadcn 4.22.1, pinned (published 2026-10-18), `add --yes --overwrite <every item URL>`                                                            |
| App      | Vite 8.3.4, `@vitejs/plugin-react` 6.1.2, React 19.3.0, TypeScript 7.0.2; `components.json` and the `@/*` path alias as `shadcn init` writes them |
| Library  | the four packages from `pnpm pack` tarballs in `.packed/`, installed as `file:` folders (`fixtures/runner/pack.ts --fixture registry`)            |
| Registry | built in memory from the working tree; the served items keep everything but `dependencies` (below)                                                |
| Browser  | Playwright's Chromium, headless, on `vite preview`                                                                                                |

The folder is its own pnpm workspace root (`'!fixtures/registry'`), as `fixtures/vite` is. Its
`pnpm-workspace.yaml` carries the root's supply-chain keys with `allowBuilds: {}`, and the one
`trustPolicyExclude` the root and the React Router fixture already have (`semver@6.3.1`, M47), which
the CLI's `@babel/core` pulls in.

## Why the served items have no dependencies

The CLI installs an item's `dependencies` whenever they name a version, even when the package is
already installed (a probe on 2026-10-27: pnpm overrides did not stop it fetching
`@nizivo/react@~0.2.0` from npm). Before a release, `~x.y.0` of the version being built is not on
npm. So the runner serves each item without `dependencies` and checks them itself: each must be a
packed package at a range its version satisfies. The item-policy linter
(`patterns/test/registry.test.ts`, and the docs build) checks that they are exactly what the files
import.

## What it found

- **The CLI drops comments above a module's first statement** (with `rsc` on or off): an MIT notice
  at the top of a `.tsx` file never reached the copy. Stylesheets keep theirs. Items now carry a
  module's notice after its imports, and the byte-for-byte check keeps it there.
- **`@nizivo/charts`' declaration files name d3-shape's `CurveFactory`** without depending on its
  types, so an app with `skipLibCheck: false` failed to typecheck. `@types/d3-shape` is now a
  dependency of the package (`.changeset/charts-curve-types.md`).
- TypeScript 7 removed `baseUrl`; `paths` alone still serves the CLI's alias resolution. A
  side-effect CSS import needs `vite/client` in `types` (TypeScript checks side-effect imports).
- One page with all 23 patterns is a 607 kB script (182 kB gzip); the fixture's
  `chunkSizeWarningLimit` is 1 MB, since it is not a size claim.

## Run it

```sh
node fixtures/runner/registry.ts [--skip-pack] [--skip-install] [--record]
```

`--record` writes `results/registry.json`; otherwise the results go to a temporary folder.
