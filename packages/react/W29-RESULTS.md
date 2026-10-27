# Week 29 results (v0.3 week 7: the copy-paste registry)

Recorded on 2026-10-27 (ARCHITECTURE.md §21.3 "Week 29 status", §19.3, decision 5, §23.4 D-dj,
M67). Every number below comes from a command run on the maintainer's Mac.

## What was built

- **The registry (D-dj)**, `apps/docs/scripts/registry.ts`, run by the docs build into the static
  export: `/r/v<version>/<name>.json`, `index.json` and `manifest.json` (SHA-256 of every file),
  `/r/latest/` a copy of the newest version, and Cloudflare `_headers` (versions cached a year,
  immutable; `latest` five minutes). 99 items at 0.2.1:
  - `init`: installs `@nizivo/react` and `@nizivo/icons`, writes `nizivo.css` (`@import
    '@nizivo/react/styles.css'`);
  - 23 pattern items: the example module, which imports its own stylesheet (and
    `@nizivo/charts/styles.css` in `analytics-page`, the one pattern that draws charts), and the
    stylesheet;
  - 75 `<name>-css` re-skin items: each stable component's readable source sheet.
    Every file lands in `components/nizivo/`, carries the MIT notice and depends only on the
    `@nizivo` packages it imports, at `~x.y.0`. No `registryDependencies`.
- **The item-policy linter** (`registryProblems`) fails the docs build; `patterns/test/registry.test.ts`
  checks the real items and each rule on a broken copy, and that the build is deterministic.
- **Frozen versions:** a Pages deploy replaces the whole site, so each release freezes its items into
  git (`node apps/docs/scripts/registry.ts --freeze`, `apps/docs/registry/v<version>/`), and every
  build serves the frozen versions unchanged. Nothing is frozen yet: 0.3.0 is the first.
- **Lane `fixture-registry`** (26 release lanes now): the shadcn CLI 4.22.1, pinned, adds every item
  from a local server to a Vite app on the packed packages; each of the 120 files must arrive byte
  for byte; then `tsc` (`skipLibCheck: false`), `vite build` with no warning, and Chromium renders
  every example of every pattern with its stylesheet applied (`fixtures/registry/RESULTS.md`).
- **`pnpm docs:deploy`** (M67): a dry run by default (main equal to origin/main, clean tree, the
  release tag, the frozen registry, `pnpm docs:check` from clean); `--deploy` uploads `apps/docs/out`
  with `wrangler pages deploy` at Wrangler 4.152.0 through `pnpm dlx`, metrics off. RELEASING.md
  "Deploying the docs" has the one-time Cloudflare steps. Claude never ran `--deploy`.
- **Docs:** the guide "The registry" (`/docs/guides/registry/`); the Patterns page links it. The
  docs smoke fetches every file of the manifest at `/r/latest/` and `/r/v<version>/` and checks its
  hash, and checks `_headers`.
- **A charts fix found by the fixture:** `@nizivo/charts`' declaration files name d3-shape's
  `CurveFactory` (`curve` on AreaChart and Sparkline) without depending on its types; an app with
  `skipLibCheck: false` failed to typecheck. `@types/d3-shape` is now a dependency (patch changeset
  `.changeset/charts-curve-types.md`).

## What the CLI does that shaped the items

- It drops every comment above a module's first statement (4.22.1, `rsc` on or off), so a notice at
  the top of a `.tsx` never reached the copy. A module carries its notice after its imports; a
  stylesheet keeps it at the top.
- It installs an item's `dependencies` whenever they name a version, even when the package is
  installed; pnpm overrides did not stop it fetching `@nizivo/react@~0.2.0` from npm. The fixture
  therefore serves items without `dependencies` and checks them against the packed packages itself.
- It resolves bare `registryDependencies` against shadcn's own registry, so items have none; `init`
  is a documented first step instead.

## Sizes

No package entry changed size (the charts fix is a `package.json` change). The registry in the
export: 101 files, 752,727 B (120,397 B gzipped together); `index.json` 67 KB, the largest item
`orders-page.json` 17 KB. A frozen version adds about 750 KB to git per release.

## Lanes (the maintainer's Mac)

All 26 release lanes passed on the first run of the week's code (`fixture-registry` in 5.6 s, the
CLI's `add` of 99 items in under a second). Visual regression: react 3,764 shots (3,606 identical,
158 within the tolerance), charts 204 (196 and 8); no baseline is new and none moved.

- The item-policy test: 9 of 9 (`patterns/test/registry.test.ts`).
- The docs smoke: 141 pages, axe clean in light and in dark at 375 px; the registry's 100 manifest
  files at `/r/latest/` and `/r/v0.2.1/` match their hashes.
- `pnpm cache:audit`: 28 tasks read only what turbo hashes for them, after the new inputs.

## For the maintainer

1. **Licence of the `-css` items:** confirmed MIT by the maintainer on 2026-10-27 (M73).
2. **The first deploy (M67):** make the Cloudflare account and the Pages project `nizivo`, add the
   custom domain and its `CNAME`, then at 0.3.0: `--freeze` after `changeset version`, publish, push
   the tags, `pnpm docs:deploy`, then `pnpm docs:deploy --deploy` in a terminal.
3. **Cut for now (D-dj):** the TanStack `data-table` block and the `-source` fork items; the linter
   rejects a `-source` name until they are built.
4. **Recorded deviation (§19.3):** items are built locally by the docs build, not in CI with a
   pinned `shadcn build`; attestation waits for v1.0 with the packages'.

## Unverified

- The deploy itself: Wrangler 4.152.0 resolves and runs (`--version`) under the repo's install
  policy, with its build scripts blocked; `pages deploy` was never run.
- Cloudflare's handling of `_headers` (the rules are in the documented format; no Pages project
  exists yet).
- `shadcn add` in a Next app: the fixture is Vite; the probe showed `rsc` changes nothing for these
  items.
