# TanStack Start fixture: results

The TanStack Start fixture (ARCHITECTURE.md §11.1, §18.1; v0.3), first run on 2026-10-27. It
installs the **packed** `@nizivo/tokens`, `@nizivo/react` and `@nizivo/icons` as the other app
fixtures do, builds with `vite build` (Start's plugin makes the client and the server), serves the
build with `vite preview` and runs the shared spec (`fixtures/runner/spec.ts`) on every route. Lane
`fixture-tanstack-start`; `results/build.json` is the recorded run.

**Verdict: all eight routes pass: hydration with no console message, axe clean in light, dark,
forced colours and reduced motion, the interactions after hydration, and each route ships only the
client modules of what it renders. The build prints no warning.**

## Setup

|         |                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Start   | `@tanstack/react-start` 1.169.4, `@tanstack/react-router` 1.170.46, file routes in `src/routes/`, Vite 8.3.4, `@vitejs/plugin-react` 6.1.2 |
| React   | 19.3.0                                                                                                                                     |
| CSS     | `@nizivo/react/styles.css?url` in the root route's `head().links` (the docs' recipe), and Vite's `build.cssTarget` at the floor            |
| Theme   | `<html data-nz-theme="system" suppressHydrationWarning>`, `ThemeScript` first in `<head>`                                                  |
| Browser | Playwright's Chromium, headless                                                                                                            |

The folder is its own pnpm workspace root (`'!fixtures/tanstack-start'`). Its `pnpm-workspace.yaml`
carries the root's supply-chain keys with `allowBuilds: {}`, the `semver@6.3.1` exclusion the root
and the other Vite fixtures accept (M47; Start's plugin pulls in `@babel/core`), and denies the agent
skills that `@tanstack/react-router` and `@tanstack/react-start` ship, as the root denies
tokens-bruecke's. `src/routeTree.gen.ts` is written by Start's router plugin on every build, so it
is gitignored.

## What it found

- **Per-route client modules:** `/button-only` and `/t0-barrel` ship no Nizivo client module;
  `/tabs` ships four (the Tabs leaf and adapter, the locale and config leaves); `/overlays` ships the
  Select, Dialog and Tooltip modules. Start splits a chunk per route, so this holds as in the Next and
  React Router fixtures.
- **The server build keeps `@nizivo/*` external** (20 imports across its chunks), so Node loads the
  published files.
- React 19 hoists the stylesheet links above the theme script in `<head>`; the script still runs
  before `<body>`, so the first paint has the stored theme.

## Not covered yet

Start's React Server Components (experimental; whether `@vitejs/plugin-rsc` honours `'use client'`
inside `node_modules` is unverified; the plan's RSC lane is non-blocking and not built), server
functions, deployment adapters other than `vite preview`, and the dev server.
